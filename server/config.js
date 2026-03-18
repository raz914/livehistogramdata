const allowMultiplePerSession =
  globalThis.process?.env?.ALLOW_MULTIPLE_SUBMISSIONS_PER_SESSION === 'true'

const ipCooldownSec = Number(globalThis.process?.env?.IP_COOLDOWN_SECONDS)
const ipCooldownMs =
  Number.isFinite(ipCooldownSec) && ipCooldownSec >= 0
    ? ipCooldownSec * 1000
    : 30 * 1000

export const APP_CONFIG = {
  minValue: 1,
  maxValue: 8,
  bucketSize: 0.5,
  trueValue: null,
  dataTtlMs: 3 * 60 * 60 * 1000,
  ipCooldownMs,
  /** When true, same browser session can submit multiple times (for client testing). */
  allowMultiplePerSession,
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }

  return req.ip || req.socket?.remoteAddress || 'unknown'
}
