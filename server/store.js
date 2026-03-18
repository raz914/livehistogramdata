import { APP_CONFIG } from './config.js'
import { buildStats } from './stats.js'

function now() {
  return Date.now()
}

export function createStore(config = APP_CONFIG) {
  const submissions = []
  const sessionMap = new Map()
  const ipLastSubmissionMap = new Map()
  const adminConfig = {
    allowMultiplePerSession: Boolean(config.allowMultiplePerSession),
    bucketSize: config.bucketSize,
    trueValue: config.trueValue ?? null,
  }

  function rebuildSessionMapFromSubmissions() {
    sessionMap.clear()
    for (const item of submissions) {
      sessionMap.set(item.sessionId, item.createdAt)
    }
  }

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
    if (!adminConfig.allowMultiplePerSession) {
      const sessionExists = sessionMap.has(sessionId)
      if (sessionExists) {
        return { ok: false, reason: 'session_duplicate' }
      }
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
    if (!adminConfig.allowMultiplePerSession) {
      sessionMap.set(sessionId, currentTime)
    }
    ipLastSubmissionMap.set(ip, currentTime)

    return { ok: true }
  }

  function getAdminConfig() {
    return {
      allowMultiplePerSession: adminConfig.allowMultiplePerSession,
      bucketSize: adminConfig.bucketSize,
      trueValue: adminConfig.trueValue,
    }
  }

  function setAdminConfig(next = {}) {
    if (typeof next.allowMultiplePerSession === 'boolean') {
      adminConfig.allowMultiplePerSession = next.allowMultiplePerSession

      if (adminConfig.allowMultiplePerSession) {
        sessionMap.clear()
      } else {
        rebuildSessionMapFromSubmissions()
      }
    }

    if (typeof next.bucketSize === 'number') {
      adminConfig.bucketSize = next.bucketSize
    }

    if (Object.hasOwn(next, 'trueValue')) {
      adminConfig.trueValue = next.trueValue
    }

    return getAdminConfig()
  }

  function getStatsPayload() {
    cleanupExpiredRecords()
    const statsConfig = {
      ...config,
      bucketSize: adminConfig.bucketSize,
      trueValue: adminConfig.trueValue,
    }

    return {
      ...buildStats(
        submissions.map((item) => item.value),
        statsConfig,
      ),
      range: {
        min: statsConfig.minValue,
        max: statsConfig.maxValue,
        bucketSize: statsConfig.bucketSize,
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
    getAdminConfig,
    setAdminConfig,
    getStatsPayload,
    cleanupExpiredRecords,
    resetAllData,
  }
}
