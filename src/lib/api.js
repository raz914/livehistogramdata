const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export async function getStats() {
  const response = await fetch(`${API_BASE_URL}/api/stats`)
  if (!response.ok) {
    throw new Error('Unable to fetch stats')
  }

  return response.json()
}

export function createEventStream(onMessage) {
  const stream = new EventSource(`${API_BASE_URL}/api/stream`)

  stream.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      onMessage(payload)
    } catch {
      // Ignore parse errors for malformed messages.
    }
  }

  return stream
}

export async function submitValue({ value, sessionId }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, sessionId }),
    })

    const payload = await response.json()

    if (!response.ok) {
      return {
        ok: false,
        message: payload?.message ?? 'Failed to submit value.',
      }
    }

    return {
      ok: true,
      stats: payload.stats,
    }
  } catch {
    return {
      ok: false,
      message: 'Network error while sending submission.',
    }
  }
}

export async function adminGetConfig({ adminKey }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/config`, {
    headers: {
      'x-admin-key': adminKey,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      message: payload?.message ?? 'Unable to load admin config.',
    }
  }

  return { ok: true, config: payload.config }
}

export async function adminSetConfig({ adminKey, updates }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify(updates),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      message: payload?.message ?? 'Unable to update admin config.',
    }
  }

  return { ok: true, config: payload.config }
}

export async function adminResetData({ adminKey }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/reset`, {
    method: 'POST',
    headers: {
      'x-admin-key': adminKey,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      message: payload?.message ?? 'Unable to reset event data.',
    }
  }

  return { ok: true, stats: payload.stats, message: payload.message }
}
