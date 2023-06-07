const path = require('path')
const { createServer } = require('http')
const { NodeSSH } = require('node-ssh')

const ssh = new NodeSSH()

if (!process.env.SSH_HOST || !process.env.SSH_USER || !process.env.SSH_KEY) {
  console.error(
    'Please at least set the following environment variables: SSH_HOST, SSH_HOST, SSH_KEY.\nOptional : PORT, SSH_PORT, SSH_PASS'
  )
  process.exit(1)
}

ssh
  .connect({
    host: process.env.SSH_HOST,
    username: process.env.SSH_USER,
    privateKeyPath: path.join(process.env.SSH_KEY),
    passphrase: process.env.SSH_PASS || undefined,
    port: process.env.SSH_PORT || 22
  })
  .then(() => {
    let globalStats

    const formatStats = (stats) => {
      const tmp = stats
        .split('\n')
        .map(line =>
          line
            .trim()
            .split('\t')
            .map(item => item.trim())
        )
        .filter(line => line && line.length === 4)
        .map(line => ({
          id: line[0].trim().toString(),
          name: line[1].trim().toString(),
          cpu: line[2].trim().toString(),
          memory: line[3].split('/').map(item => item.trim().toString())
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      tmp.forEach((item) => {
        item.status =
          globalStats?.find(s => s.id === item.id)?.status || 'unknown'
        item.state =
          globalStats?.find(s => s.id === item.id)?.state || 'unknown'
      })
      return tmp
    }

    const getDockerStats = async () => {
      const data = await ssh.exec('/usr/bin/docker', [
        'stats',
        '--no-trunc',
        '--all',
        '--no-stream',
        '--format',
        '{{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
      ])
      return formatStats(data)
    }

    const getDockerStatus = async () => {
      try {
        return JSON.parse(
          await ssh.exec('/usr/bin/curl', [
            '--silent',
            '--no-buffer',
            '--unix-socket',
            '/var/run/docker.sock',
            'http://localhost/containers/json?all=true'
          ])
        )
      } catch (err) {
        console.log(err)
        return null
      }
    }

    const pullStats = () => {
      getDockerStatus().then((data) => {
        if (data) {
          const values = data.map(item => ({
            id: item.Id,
            state: item.State,
            status: item.Status
          }))
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

    const PORT = process.env.PORT || 20302

    console.log('Starting server on port ' + PORT + '...')
    getDockerStats().then((v) => {
      if (v) globalStats = v
      pullStats()

      // Simple HTTP server
      createServer((req, res) => {
        const headers = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS, GET',
          'Access-Control-Max-Age': 2592000
        }

        const GETHeaders = { ...headers, 'Content-Type': 'application/json' }

        if (req.method === 'OPTIONS') {
          res.writeHead(204, headers)
          res.end()
          return
        }

        if (req.method === 'GET') {
          res.writeHead(200, GETHeaders)
          res.end(JSON.stringify(globalStats))
          return
        }

        res.writeHead(405, headers)
        res.end(`${req.method} is not allowed for the request.`)
      })
        .listen(PORT)
        .on('listening', () => {
          console.log('Server started : http://localhost:' + PORT)
        })
    })
  })
