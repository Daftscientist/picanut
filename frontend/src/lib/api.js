const DEFAULT_TIMEOUT_MS = 20000

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return { signal: controller.signal, cancel: () => clearTimeout(t) }
}

export async function apiRequest(path, { method = 'GET', token, headers, json, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const { signal: timedSignal, cancel } = withTimeout(signal, timeoutMs)
  try {
    const h = new Headers(headers || {})
    if (token) h.set('Authorization', `Bearer ${token}`)
    if (json !== undefined) h.set('Content-Type', 'application/json')

    const resp = await fetch(path, {
      method,
      headers: h,
      body: json !== undefined ? JSON.stringify(json) : body,
      signal: timedSignal,
      credentials: 'omit',
    })

    const ct = resp.headers.get('content-type') || ''
    const isJson = ct.includes('application/json')
    const data = isJson ? await resp.json().catch(() => null) : await resp.arrayBuffer()

    if (!resp.ok) {
      const msg = (isJson && data && data.error) ? data.error : `Request failed (${resp.status})`
      throw new ApiError(msg, { status: resp.status, data })
    }

    return { resp, data }
  } finally {
    cancel()
  }
}

export async function apiJson(path, opts = {}) {
  const { data } = await apiRequest(path, opts)
  if (data && typeof data === 'object' && !(data instanceof ArrayBuffer)) return data
  throw new ApiError('Expected JSON response', { status: 0, data: null })
}

