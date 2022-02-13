const path = require('path')
const nanoexpress = require('nanoexpress')
const cors = require('cors')
const { NodeSSH } = require('node-ssh')

const ssh = new NodeSSH()

if (!process.env.SSH_HOST || !process.env.SSH_USER || !process.env.SSH_KEY) {
  console.error('Please set the following environment variables: HOST, USER, SSH_KEY')
  process.exit(1)
}

ssh.connect({
  host: process.env.SSH_HOST,
  username: process.env.SSH_USER,
  privateKey: path.join(process.env.SSH_KEY),
  passphrase: process.env.SSH_PASS || undefined,
  port: process.env.SSH_PORT || 22
}).then(() => {
  let globalStats

  const formatStats = (stats) => {
    const tmp = stats.split('\n')
      .map(line => line.trim().split('\t').map(item => item.trim()))
      .filter(line => line && line.length === 4)
      .map(line => ({
        id: line[0].trim().toString(),
        name: line[1].trim().toString(),
        cpu: line[2].trim().toString(),
        memory: line[3].split('/').map(item => item.trim().toString())
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    tmp.forEach((item) => {
      item.status = globalStats?.find(s => s.id === item.id)?.status || 'unknown'
      item.state = globalStats?.find(s => s.id === item.id)?.state || 'unknown'
    })
    return tmp
  }

  const getDockerStats = async () => {
    const data = await ssh.exec('/usr/bin/docker',
      ['stats', '--no-trunc', '--all', '--no-stream', '--format', '{{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'])
    return formatStats(data)
  }

  const getDockerStatus = async () => {
    try {
      return JSON.parse(await ssh.exec('/usr/bin/curl',
        ['--silent', '--no-buffer', '--unix-socket', '/var/run/docker.sock', 'http://localhost/containers/json?all=true']))
    } catch (err) {
      console.log(err)
      return null
    }
  }

  const pullStats = () => {
    getDockerStatus().then((data) => {
      if (data) {
        const values = data.map(item => ({ id: item.Id, state: item.State, status: item.Status }))
        values.forEach((v) => {
          const element = globalStats.find(i => v.id === i.id)
          if (element) {
            element.status = v.status
            element.state = v.state
          }
        })
      }
    })
  }

  setInterval(() => {
    pullStats()
  }, 60 * 1000 * 2) // every 2 minutes

  setInterval(() => {
    getDockerStats().then((data) => {
      if (data) globalStats = data
    })
  }, 60 * 1000 * 10) // every 10 minutes

  /**
   * Simple nano express server
   */
  const app = nanoexpress()

  app.use(cors())

  app.get('/', (req, res) => {
    return res.json(globalStats)
  })

  const PORT = process.env.PORT || 20302
  console.log('Starting server on port ' + PORT + '...')
  getDockerStats().then((v) => {
    if (v) globalStats = v
    pullStats()
    app.listen(PORT).then(() => {
      console.log('Server started')
    })
  })
})
