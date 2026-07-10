// Design-system status pills: green #D1FAE5/#065F46, amber #FEF3C7/#92400E,
// red #FEE2E2/#991B1B — dark text on tinted bg so badges stay readable on white cards.
const styles: Record<string, { bg: string; text: string; dot: string }> = {
  active:     { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  delivered:  { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  sold:       { bg: '#F5EBD0', text: '#92621A', dot: '#C9A84C' },
  pending:    { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  open:       { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  confirmed:  { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  accepted:   { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  in_transit: { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
  expired:    { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
}

export default function StatusBadge({ status }: { status: string }) {
  const s = styles[status] ?? { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 9999,
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 700,
      textTransform: 'capitalize' as const,
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
      {status.replace('_', ' ')}
    </span>
  )
}
