import axios from "axios"

import { clearToken, getToken } from "./auth"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth endpoints handle their own 401s (wrong password on login, or the
// graceful mount-time check in AuthContext) - this interceptor exists for
// every OTHER authenticated call. If the token dies mid-session, a 401 from
// any of those means the same thing everywhere: log out and send the user
// back to /login, rather than leaving them stuck on a page silently failing
// every request it makes from here on.
const SELF_HANDLED_AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/me"]

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? ""
    const isSelfHandled = SELF_HANDLED_AUTH_PATHS.some((path) => url.includes(path))

    if (error.response?.status === 401 && !isSelfHandled) {
      clearToken()
      window.location.href = "/login"
    }

    return Promise.reject(error)
  }
)
