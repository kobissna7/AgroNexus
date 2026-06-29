import { createContext, useState, ReactNode } from 'react'
import type { AuthUser } from '../types'

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('agronexus_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem('agronexus_user') ?? 'null') } catch { return null }
  })

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('agronexus_token', token)
    localStorage.setItem('agronexus_user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('agronexus_token')
    localStorage.removeItem('agronexus_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
