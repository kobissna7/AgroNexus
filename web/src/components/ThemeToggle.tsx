import { useTheme } from '../context/ThemeContext'

/** Sun/moon pill that flips between light and dark (overriding the OS theme). */
export default function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const { resolved, toggle } = useTheme()
  const dark = resolved === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="btn-ghost"
      style={{ minHeight: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', ...style }}
    >
      {dark ? (
        /* sun */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        /* moon */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 18, height: 18 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  )
}
