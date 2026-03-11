import { APP_CONFIG } from './config.js'
import { buildStats } from './stats.js'

function now() {
  return Date.now()
}

export function createStore(config = APP_CONFIG) {
  const submissions = []
  const sessionMap = new Map()
  const ipLastSubmissionMap = new Map()

  function cleanupExpiredRecords() {
    const cutoff = now() - config.dataTtlMs

    while (submissions.length > 0 && submissions[0].createdAt < cutoff) {
      const removed = submissions.shift()
      if (!removed) {
        break
      }

      if (sessionMap.get(removed.sessionId) === removed.createdAt) {
        sessionMap.delete(removed.sessionId)
      }
    }

    for (const [ip, submittedAt] of ipLastSubmissionMap.entries()) {
      if (submittedAt < cutoff) {
        ipLastSubmissionMap.delete(ip)
      }
    }
  }

  function addSubmission({ value, sessionId, ip }) {
    cleanupExpiredRecords()

    const currentTime = now()
    const sessionExists = sessionMap.has(sessionId)
    if (sessionExists) {
      return { ok: false, reason: 'session_duplicate' }
    }

    const ipLastSubmittedAt = ipLastSubmissionMap.get(ip)
    if (ipLastSubmittedAt && currentTime - ipLastSubmittedAt < config.ipCooldownMs) {
      return { ok: false, reason: 'ip_cooldown' }
    }

    submissions.push({
      value,
      sessionId,
      ip,
      createdAt: currentTime,
    })
    sessionMap.set(sessionId, currentTime)
    ipLastSubmissionMap.set(ip, currentTime)

    return { ok: true }
  }

  function getStatsPayload() {
    cleanupExpiredRecords()

    return {
      ...buildStats(
        submissions.map((item) => item.value),
        config,
      ),
      range: {
        min: config.minValue,
        max: config.maxValue,
        bucketSize: config.bucketSize,
      },
    }
  }

  function resetAllData() {
    submissions.length = 0
    sessionMap.clear()
    ipLastSubmissionMap.clear()
  }

  return {
    addSubmission,
    getStatsPayload,
    cleanupExpiredRecords,
    resetAllData,
  }
}
