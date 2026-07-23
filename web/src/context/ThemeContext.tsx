import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (p: ThemePreference) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'agronexus_theme'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storedPreference(): ThemePreference {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch { /* private mode */ }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(storedPreference)
  const [system, setSystem] = useState<'light' | 'dark'>(systemTheme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(systemTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p)
    try {
      if (p === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, p)
    } catch { /* private mode */ }
    if (p === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', p)
  }

  const resolved = preference === 'system' ? system : preference
  const toggle = () => setPreference(resolved === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
