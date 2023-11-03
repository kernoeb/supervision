const fsPromises = require('fs').promises
const fs = require('fs')
const { createServer } = require('http')
const { exec } = require('child_process')
const axios = require('axios')
const dotenv = require('dotenv')
const FormData = require('form-data')
const { format, parseISO } = require('date-fns')

const API_KEY_DTRACK = process.env.API_KEY_DTRACK

if (!API_KEY_DTRACK) {
  console.error('API_KEY_DTRACK is not set')
  process.exit(1)
}

let simplifiedData = []

async function fetchData () {
  try {
    simplifiedData = []

    const response = await axios.get(
      'http://localhost:8081/api/v1/project?excludeInactive=true&onlyRoot=true&searchText=&sortName=lastBomImport&sortOrder=asc&pageSize=25&pageNumber=1', {
        headers: {
          'X-Api-Key': API_KEY_DTRACK

        }
      })

    const projects = response.data
    const currentDate = new Date().toISOString()

    simplifiedData = projects.map(project => ({
      name: project.name,
      version: project.version,
      metrics: project.metrics,
      lastInheritedRiskScore: project.lastInheritedRiskScore,
      active: project.active,
      uuid: project.uuid,
      lastBomImportDate: format(parseISO(new Date(project.lastBomImport).toISOString())),
      currentDate
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des données :', error)
  }
}

dotenv.config()

const services = [
  'mydatacatalogue:5',
  'thesaurus:5',
  'document:5',
  'normalizer:5',
  'crawler-api:5',
  'crawler-batch:5',
  'crawler-desktop:5',
  'crawler-gui:5',
  'licences:5',
  'documentation:5',
  'data-portal:5',
  'stats:5',
  'support:1',
  'lineage:1',
  'anonymizer:1',
  'social:1',
  'simple-directory:7',
  'notify:3'
]

function runCommand (command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur lors de l'exécution de la commande : ${command}`)
        console.error(stderr)
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

async function dockerpull (service, version) {
  try {
    if (version === 'master') {
      await runCommand(`docker pull registry.gitlab.com/dawizz/${service}:${version}`)
    } else {
      await runCommand(`docker pull registry.dawizz.fr/${service}:${version}`)
    }
  } catch (error) {
    console.error(`Erreur lors du pull docker de ${service} : `, error)
    process.exit(1)
  }
}

async function trivyDocker (service, version) {
  let sbomFilePath = ''
  if (service === 'mydatacatalogue') {
    sbomFilePath = 'sbom/catalogue.json'
  } else {
    sbomFilePath = `sbom/${service}.json`
  }

  try {
    await fsPromises.access(sbomFilePath)
    await fsPromises.unlink(sbomFilePath)
  } catch { }

  console.log(`Exécution de Trivy pour ${service}`)
  try {
    if (version === 'master') {
      await runCommand(`trivy image --format cyclonedx --output ${sbomFilePath} registry.gitlab.com/dawizz/${service}:${version}`)
    } else {
      await runCommand(`trivy image --format cyclonedx --output ${sbomFilePath} registry.dawizz.fr/${service}:${version}`)
    }
  } catch {
    process.exit(1)
  }
}

async function createOrGetProject (serviceName, versionProject) {
  if (serviceName === 'mydatacatalogue') {
    serviceName = 'catalogue'
  }
  const projectApiUrl = 'http://localhost:8081/api/v1/project'
  const apiKey = API_KEY_DTRACK

  try {
    const response = await axios.get(projectApiUrl, {
      params: {
        name: serviceName,
        version: versionProject
      },
      headers: {
        'X-Api-Key': apiKey
      }
    })
    const matchingProjects = response.data.filter((project) => {
      return project.name === serviceName && project.version === versionProject
    })

    if (matchingProjects.length > 0) {
      return matchingProjects[0].uuid
    } else {
      const createProjectResponse = await axios.put(
        projectApiUrl,
        { name: serviceName, version: versionProject },
        {
          headers: {
            'X-Api-Key': apiKey
          }
        }
      )
      return createProjectResponse.data.uuid
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification/création du projet pour ${serviceName}: `, error)
    return null
  }
}

async function sendSBOMs (service, sbomFilePath, projectId) {
  if (service === 'mydatacatalogue') {
    service = 'catalogue'
  }
  if (sbomFilePath === 'sbom/mydatacatalogue.json') {
    sbomFilePath = 'sbom/catalogue.json'
  }
  const apiUrl = 'http://localhost:8081/api/v1/bom'
  const apiKey = API_KEY_DTRACK

  const form = new FormData()
  form.append('project', projectId)

  const sbomData = fs.createReadStream(sbomFilePath)
  form.append('bom', sbomData)

  const headers = {
    ...form.getHeaders(),
    'X-Api-Key': apiKey
  }

  try {
    await axios.post(apiUrl, form, { headers })
    console.log(`Requête pour ${service} effectuée avec succès.`)
  } catch (error) {
    console.error(`Erreur lors de la requête pour ${service}: `, error)
  }
}

async function main () {
  try {
    try {
      await fsPromises.access('sbom', fs.constants.F_OK)
    } catch (err) {
      if (err.code === 'ENOENT') {
        await fsPromises.mkdir('sbom')
        console.log('Dossier "sbom" créé avec succès.')
      }
    }
    for (const service of services) {
      console.log(`Début pour ${service}`)

      const nom = service.split(':')[0]
      const version = service.split(':')[1]

      await dockerpull(nom, version)
      await trivyDocker(nom, version)

      const projectId = await createOrGetProject(nom)
      if (projectId) {
        await sendSBOMs(service, `sbom/${nom}.json`, projectId)
      }

      console.log(`Terminé pour ${service}`)
    }
    console.log('Terminé pour tous les services')
  } catch (error) {
    console.error('Une erreur s\'est produite :', error)
    process.exit(1)
  }
}

fetchData()

main()

setInterval(fetchData, 1000 * 120)

setInterval(main, 1000 * 43200)

const PORT = process.env.PORT || 20304

createServer((req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, GET',
    'Access-Control-Max-Age': '2592000'
  }

  const GETHeaders = { ...headers, 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  if (req.method === 'GET') {
    res.writeHead(200, GETHeaders)
    res.end(JSON.stringify(simplifiedData))
    return
  }

  res.writeHead(405, headers)
  res.end(`${req.method} is not allowed for the request.`)
})
  .listen(PORT)
  .on('listening', () => {
    console.log('Server started: http://localhost:' + PORT)
  })
