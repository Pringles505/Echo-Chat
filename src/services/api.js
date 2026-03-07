/**
 * Centralized API service.
 *
 * All HTTP calls go through here — never use raw fetch() in components.
 * Auth token is automatically injected on every request.
 *
 * Usage:
 *   import { api } from '@services/api';
 *   const data = await api.get('/users/me');
 *   await api.post('/auth/login', { username, password });
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token')

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.message || body.error || message
    } catch {
      // JSON parse failed — use statusText
    }
    throw new ApiError(message, res.status)
  }

  // 204 No Content — return null
  if (res.status === 204) return null

  return res.json()
}

export const api = {
  /**
   * @param {string} url
   * @returns {Promise<any>}
   */
  get: (url) => request(url),

  /**
   * @param {string} url
   * @param {object} data
   * @returns {Promise<any>}
   */
  post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),

  /**
   * @param {string} url
   * @param {object} data
   * @returns {Promise<any>}
   */
  put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * @param {string} url
   * @param {object} data
   * @returns {Promise<any>}
   */
  patch: (url, data) => request(url, { method: 'PATCH', body: JSON.stringify(data) }),

  /**
   * @param {string} url
   * @returns {Promise<any>}
   */
  delete: (url) => request(url, { method: 'DELETE' }),
}
