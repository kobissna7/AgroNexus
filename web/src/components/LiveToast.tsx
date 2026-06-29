import { ReactNode, useEffect, useState } from 'react'
import { BellIcon, XIcon } from './icons'

interface Toast {
  id: number
  message: string
  icon: ReactNode
}

let _setToast: ((t: Toast) => void) | null = null
let _idSeq = 0

/** Call this from anywhere to show a live-update toast. */
export function showToast(message: string, icon: ReactNode = <BellIcon className="w-5 h-5" />) {
  _setToast?.({ id: ++_idSeq, message, icon })
}

/** Mount once inside Layout — renders the floating toast. */
export default function LiveToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    _setToast = setToast
    return () => { _setToast = null }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast) return null

  return (
    <div
      key={toast.id}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium shadow-xl animate-slide-up"
      style={{ backgroundColor: '#0D2B1F', color: '#fff', maxWidth: 320 }}
    >
      <span className="flex-shrink-0">{toast.icon}</span>
      <span>{toast.message}</span>
      <button
        onClick={() => setToast(null)}
        className="ml-2 opacity-60 hover:opacity-100 flex-shrink-0"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
