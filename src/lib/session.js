const SESSION_STORAGE_KEY = 'live-graph-session-id'

export function getOrCreateSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const generated = crypto.randomUUID()
  window.localStorage.setItem(SESSION_STORAGE_KEY, generated)
  return generated
}
