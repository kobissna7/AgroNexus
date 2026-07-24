import { createContext, useContext, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  resolved: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'agronexus_theme'

// Light is the default regardless of OS preference — dark is opt-in only,
// chosen via the toggle and persisted from then on. Mirrors the pre-paint
// script in index.html, which must resolve the same way to avoid a flash.
function storedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch { /* private mode */ }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolved, setResolved] = useState<Theme>(storedTheme)

  const toggle = () => {
    const next: Theme = resolved === 'dark' ? 'light' : 'dark'
    setResolved(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* private mode */ }
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ resolved, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
