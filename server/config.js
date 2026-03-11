export const APP_CONFIG = {
  minValue: 1,
  maxValue: 8,
  bucketSize: 0.5,
  dataTtlMs: 3 * 60 * 60 * 1000,
  ipCooldownMs: 30 * 1000,
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }

  return req.ip || req.socket?.remoteAddress || 'unknown'
}
