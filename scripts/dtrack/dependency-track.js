const { createServer } = require('http')
const axios = require('axios')

if (!process.env.API_KEY_DTRACK) {
  console.error('API_KEY_DTRACK is not set')
  process.exit(1)
}

let simplifiedData = []

async function fetchData () {
  try {
    const response = await axios.get(
      'http://localhost:8081/api/v1/project?excludeInactive=true&onlyRoot=true&searchText=&sortName=lastBomImport&sortOrder=asc&pageSize=25&pageNumber=1', {
        headers: {
          'X-Api-Key': process.env.API_KEY_DTRACK

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
      lastBomImportDate: new Date(project.lastBomImport).toISOString(),
      currentDate
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des données :', error)
  }
}

fetchData()

setInterval(fetchData, 1000 * 120)

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
