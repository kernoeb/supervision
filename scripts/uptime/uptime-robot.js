const { createServer } = require('http')
const tiny = require('tiny-json-http')

if (!process.env.API_KEY) {
  console.error('API_KEY is not set')
  process.exit(1)
}

let globalUptime = {}

const statuses = {
  0: 'paused',
  1: 'not-checked',
  2: 'up',
  3: 'seems-down',
  4: 'down'
}

const normalizeText = (text) => {
  return text.toLowerCase().replace(/[^a-z0-9- ]/g, '')
}

const pullUptimeRobot = async () => {
  console.log('Pulling uptime robot...')
  const { body } = await tiny.post({
    url: 'https://api.uptimerobot.com/v2/getMonitors',
    data: {
      api_key: process.env.API_KEY, format: 'json', logs: 0, custom_uptime_ratios: 30
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'cache-control': 'no-cache'
    }
  })
  const tmp = body.monitors
  globalUptime = {
    timestamp: new Date().toISOString(),
    monitors: tmp.map((monitor) => {
      return {
        id: monitor.id,
        name: normalizeText(monitor.friendly_name),
        status: statuses[monitor.status],
        uptime: parseFloat(monitor.custom_uptime_ratio) / 100
      }
    })
  }
}

pullUptimeRobot()
setInterval(pullUptimeRobot, 1000 * 60) // every minute

const PORT = process.env.PORT || 20303

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
    res.end(JSON.stringify(globalUptime))
    return
  }

  res.writeHead(405, headers)
  res.end(`${req.method} is not allowed for the request.`)
}).listen(PORT).on('listening', () => {
  console.log('Server started : http://localhost:' + PORT)
})
