import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agronexus_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url: string = err.config?.url ?? ''
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('agronexus_token')
      localStorage.removeItem('agronexus_user')
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?next=${next}`
    }
    return Promise.reject(err)
  }
)

export default api
