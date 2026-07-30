import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'

/**
 * PWAInstallBanner
 * Shows an "Add to Home Screen" strip at the bottom of the screen when the
 * browser signals the app is installable. Automatically disappears after
 * install or dismissal.
 */
export function PWAInstallBanner() {
  const { installable, installed, triggerInstall } = usePWA()
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa_prompt_dismissed') === 'true'
  })

  if (!installable || installed || dismissed) return null

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '14px 20px',
        background: 'var(--brand, #1a6b35)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        animation: 'slideUpIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <img
        src="/favicon-48.png"
        alt="AgroNexus icon"
        width={36}
        height={36}
        style={{ borderRadius: 10, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 800, fontSize: '0.9375rem', lineHeight: 1.2, margin: 0 }}>
          Install AgroNexus
        </p>
        <p style={{ fontSize: '0.8125rem', opacity: 0.85, margin: '2px 0 0', lineHeight: 1.3 }}>
          Add to your home screen for faster access
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={triggerInstall}
          style={{
            padding: '9px 20px',
            background: '#fff',
            color: 'var(--brand, #1a6b35)',
            border: 'none',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('pwa_prompt_dismissed', 'true')
          }}
          aria-label="Dismiss"
          style={{
            padding: '9px 12px',
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * PWAUpdateToast
 * Shows a small toast when a new version of the app is ready.
 * Clicking "Update" activates the new service worker and reloads.
 */
export function PWAUpdateToast() {
  const { swUpdated, reloadForUpdate } = usePWA()

  if (!swUpdated) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#1a2e1d',
        color: '#fff',
        borderRadius: 14,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        whiteSpace: 'nowrap',
        animation: 'slideUpIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        fontSize: '0.9rem',
      }}
    >
      <span>🔄 New version available</span>
      <button
        onClick={reloadForUpdate}
        style={{
          padding: '7px 16px',
          background: 'var(--brand, #1a6b35)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        Update now
      </button>
    </div>
  )
}
