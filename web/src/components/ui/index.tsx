/* AgroNexus ui primitives — thin wrappers over the token utility classes in
   index.css. Pages use these instead of inline-styled raw elements. */
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type CSSProperties } from 'react'

/* ── Button ──────────────────────────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'outline' | 'ghost'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'md' | 'lg'
}
const btnClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
}
export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return <button className={`${btnClass[variant]} ${size === 'lg' ? 'btn-lg' : ''} ${className}`.trim()} {...rest} />
}

/* ── Card ────────────────────────────────────────────────────────────────── */
export function Card({ children, lift = false, className = '', style }: {
  children: ReactNode; lift?: boolean; className?: string; style?: CSSProperties
}) {
  return (
    <div className={`card ${lift ? 'card-lift' : ''} ${className}`.trim()} style={{ padding: 24, ...style }}>
      {children}
    </div>
  )
}

/* ── Inputs ──────────────────────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string }
export function Input({ label, id, ...rest }: InputProps) {
  const input = <input id={id} className="input-field" {...rest} />
  if (!label) return input
  return (
    <label htmlFor={id} style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>{label}</span>
      {input}
    </label>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string }
export function Select({ label, id, children, ...rest }: SelectProps) {
  const select = <select id={id} className="input-field" {...rest}>{children}</select>
  if (!label) return select
  return (
    <label htmlFor={id} style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6 }}>{label}</span>
      {select}
    </label>
  )
}

/* ── Badge ───────────────────────────────────────────────────────────────── */
type BadgeVariant = 'solid' | 'soft' | 'outline' | 'invert'
export function Badge({ variant = 'soft', children, style }: { variant?: BadgeVariant; children: ReactNode; style?: CSSProperties }) {
  return <span className={`badge badge-${variant}`} style={style}>{children}</span>
}

/* ── PageHeader ──────────────────────────────────────────────────────────── */
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink-strong)', lineHeight: 1.15 }}>
          {title}
        </h1>
        {sub && <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 6 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, maxWidth = 480 }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; maxWidth?: number
}) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      className="animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card animate-slide-up"
        style={{ width: '100%', maxWidth, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-pop)' }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-strong)' }}>{title}</h2>
            <button onClick={onClose} className="btn-ghost" style={{ minHeight: 32, padding: '0 10px', fontSize: 18, lineHeight: 1 }} aria-label="Close">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────────────────────────────── */
export function EmptyState({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--ink-muted)' }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
          background: 'var(--brand-soft)', color: 'var(--brand-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      )}
      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{title}</p>
      {sub && <p style={{ fontSize: 14, marginTop: 6 }}>{sub}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  )
}
