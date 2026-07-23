// /home/ekko-7/AgroNexus/web/src/pages/admin/AdminUsers.tsx
import { useCallback, useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import type { UserRole } from '../../types'

interface AdminUser {
  id: string
  email: string
  role: UserRole
  full_name: string
  region: string | null
  phone: string | null
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  farmer:          'var(--brand-soft)',
  wholesaler:      'var(--surface-2)',
  retailer:        'var(--surface-2)',
  direct_consumer: 'var(--surface-2)',
  consumer:        'var(--surface-2)',  // legacy pre-v2 rows
  transporter:     'var(--brand-soft)',
  admin:           'var(--invert-bg)',
}
const ROLE_TEXT: Record<string, string> = {
  farmer:          'var(--brand-ink)',
  wholesaler:      'var(--ink)',
  retailer:        'var(--ink)',
  direct_consumer: 'var(--ink)',
  consumer:        'var(--ink)',
  transporter:     'var(--brand-ink)',
  admin:           'var(--invert-ink)',
}

// v2 role set — must match the backend's allowed list in admin.controller
const ROLES: UserRole[] = ['farmer', 'wholesaler', 'retailer', 'direct_consumer', 'transporter', 'admin']

const roleLabel = (r: string) =>
  r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export default function AdminUsers() {
  const [users, setUsers]       = useState<AdminUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [changing, setChanging] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<AdminUser[]>('/api/v1/admin/users')
      setUsers(data)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setChanging(userId)
    try {
      await api.patch(`/api/v1/admin/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change role'
      alert(msg)
    } finally {
      setChanging(null)
    }
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/v1/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete user'
      alert(msg)
    }
  }

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const q = search.toLowerCase()
    const matchSearch = !q || u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  return (
    <Layout>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--ink-strong)', letterSpacing: '-0.01em' }}>
            User Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>
            {users.length} total users
          </p>
        </div>
        <button
          onClick={fetchUsers}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '9999px',
            border: '1px solid var(--edge)',
            background: 'var(--surface)', color: 'var(--ink)',
            fontSize: '0.8125rem', fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          Refresh
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '12rem', position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '0.9375rem', height: '0.9375rem', color: 'var(--ink-muted)', pointerEvents: 'none' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.625rem 1rem 0.625rem 2.375rem',
              borderRadius: '9999px',
              border: '1px solid var(--edge)',
              backgroundColor: 'var(--surface)',
              fontSize: '0.875rem', color: 'var(--ink)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Role filter pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['all', ...ROLES] as const).map(r => {
            const isActive = roleFilter === r
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={isActive ? {
                  padding: '0.5rem 1rem', borderRadius: '9999px',
                  fontSize: '0.8125rem', fontWeight: 600,
                  background: 'var(--brand)',
                  color: 'var(--on-brand)', border: 'none',
                  boxShadow: '0 4px 12px rgba(11,46,20,0.30)',
                  cursor: 'pointer',
                } : {
                  padding: '0.5rem 1rem', borderRadius: '9999px',
                  fontSize: '0.8125rem', fontWeight: 500,
                  backgroundColor: 'var(--surface)', color: 'var(--ink)',
                  border: '1px solid var(--edge)', cursor: 'pointer',
                }}
              >
                {r === 'all' ? 'All Roles' : roleLabel(r)}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--edge-strong)',
          borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem',
          fontSize: '0.875rem', color: 'var(--ink)',
        }}>
          {error}
        </div>
      )}

      {/* ── Table card ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(13,43,31,0.08)',
      }}>
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: '3rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface-2)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--ink-muted)' }}>No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--brand)' }}>
                  {['User', 'Role', 'Region', 'Phone', 'Joined', 'Actions'].map(col => (
                    <th key={col} style={{
                      padding: '0.875rem 1.5rem', textAlign: 'left',
                      fontSize: '0.6875rem', fontWeight: 600,
                      color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      border: 'none',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50"
                    style={{ borderBottom: '1px solid var(--edge)', transition: 'background 0.12s' }}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <p style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{u.full_name || '—'}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.125rem' }}>{u.email}</p>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <select
                        value={u.role}
                        disabled={changing === u.id}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        style={{
                          padding: '0.3125rem 0.875rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem', fontWeight: 700,
                          border: 'none', outline: 'none',
                          cursor: changing === u.id ? 'not-allowed' : 'pointer',
                          backgroundColor: ROLE_COLORS[u.role] ?? 'var(--surface-2)',
                          color: ROLE_TEXT[u.role] ?? 'var(--ink)',
                        }}
                      >
                        {!ROLES.includes(u.role) && (
                          <option value={u.role} disabled>{roleLabel(u.role)} (legacy)</option>
                        )}
                        {ROLES.map(r => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--ink-muted)' }}>{u.region ?? '—'}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--ink-muted)' }}>{u.phone ?? '—'}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--ink-muted)', fontSize: '0.75rem' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <button
                        onClick={() => handleDelete(u.id, u.full_name)}
                        style={{
                          fontSize: '0.75rem', padding: '0.3125rem 0.875rem',
                          borderRadius: '9999px', border: '1px solid var(--edge-strong)',
                          color: 'var(--ink)', background: 'transparent',
                          cursor: 'pointer', transition: 'background 0.12s',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
