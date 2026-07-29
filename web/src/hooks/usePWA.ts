import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/**
 * Registers the service worker and exposes PWA install functionality.
 *
 * Returns:
 *   - `installable`  — true when the browser has an install prompt ready
 *   - `installed`    — true once the user accepts
 *   - `triggerInstall` — call this to show the browser's install dialog
 *   - `swUpdated`    — true when a new service worker is waiting (needs reload)
 *   - `reloadForUpdate` — call this to activate the waiting SW and reload
 */
export function usePWA() {
  const [installable, setInstallable]   = useState(false)
  const [installed, setInstalled]       = useState(false)
  const [swUpdated, setSwUpdated]       = useState(false)
  const [swReg, setSwReg]               = useState<ServiceWorkerRegistration | null>(null)

  // ── Register service worker ────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        setSwReg(reg)

        // New SW installed but waiting — notify user there's an update
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setSwUpdated(true)
            }
          })
        })
      })
      .catch((err) => console.warn('[PWA] SW registration failed:', err))

    // Reload once the new SW activates
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [])

  // ── Capture install prompt ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detect if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    const appInstalled = () => { setInstalled(true); setInstallable(false) }
    window.addEventListener('appinstalled', appInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalled)
    }
  }, [])

  // ── Trigger install dialog ─────────────────────────────────────────────────
  const triggerInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    deferredPrompt = null
    setInstallable(false)
  }

  // ── Activate waiting SW (update) ──────────────────────────────────────────
  const reloadForUpdate = () => {
    if (!swReg?.waiting) return
    swReg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  return { installable, installed, triggerInstall, swUpdated, reloadForUpdate }
}
