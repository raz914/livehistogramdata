import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { validate as isUuid } from 'uuid'

import { APP_CONFIG, getClientIp } from './config.js'
import { createStore } from './store.js'

const app = express()
const port = Number(globalThis.process?.env?.PORT || 3001)
const adminResetKey = globalThis.process?.env?.ADMIN_RESET_KEY || ''
const store = createStore(APP_CONFIG)
const sseClients = new Set()

app.use(cors())
app.use(express.json())

function isValidValue(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= APP_CONFIG.minValue &&
    value <= APP_CONFIG.maxValue
  )
}

function broadcastStats() {
  const payload = `data: ${JSON.stringify(store.getStatsPayload())}\n\n`

  for (const response of sseClients) {
    response.write(payload)
  }
}

function hasValidAdminKey(req) {
  if (!adminResetKey) {
    return false
  }

  const keyFromHeader = req.headers['x-admin-key']
  return typeof keyFromHeader === 'string' && keyFromHeader === adminResetKey
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/stats', (_req, res) => {
  res.json(store.getStatsPayload())
})

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  sseClients.add(res)
  res.write(`data: ${JSON.stringify(store.getStatsPayload())}\n\n`)

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 20000)

  req.on('close', () => {
    clearInterval(heartbeat)
    sseClients.delete(res)
  })
})

app.post('/api/submissions', (req, res) => {
  const { value, sessionId } = req.body ?? {}
  const ip = getClientIp(req)

  if (!isUuid(sessionId)) {
    return res.status(400).json({
      error: 'invalid_session',
      message: 'A valid session id is required.',
    })
  }

  if (!isValidValue(value)) {
    return res.status(400).json({
      error: 'invalid_value',
      message: `Value must be between ${APP_CONFIG.minValue} and ${APP_CONFIG.maxValue}.`,
    })
  }

  const result = store.addSubmission({ value, sessionId, ip })

  if (!result.ok && result.reason === 'session_duplicate') {
    return res.status(409).json({
      error: 'duplicate_submission',
      message: 'This browser session has already submitted a response.',
    })
  }

  if (!result.ok && result.reason === 'ip_cooldown') {
    return res.status(429).json({
      error: 'too_many_requests',
      message: 'Please wait before submitting again from this network.',
    })
  }

  broadcastStats()
  return res.status(201).json({
    ok: true,
    stats: store.getStatsPayload(),
  })
})

app.post('/api/admin/reset', (req, res) => {
  if (!hasValidAdminKey(req)) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'A valid admin key is required.',
    })
  }

  store.resetAllData()
  broadcastStats()

  return res.status(200).json({
    ok: true,
    message: 'Event data has been reset.',
    stats: store.getStatsPayload(),
  })
})

setInterval(() => {
  store.cleanupExpiredRecords()
  broadcastStats()
}, 60 * 1000)

app.listen(port, () => {
  console.log(`Live data server running on http://localhost:${port}`)
})
