const styles: Record<string, { bg: string; text: string; dot: string }> = {
  active:     { bg: 'rgba(52,211,153,0.12)',  text: '#34D399', dot: '#34D399' },
  sold:       { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C', dot: '#C9A84C' },
  expired:    { bg: 'rgba(248,113,113,0.12)', text: '#F87171', dot: '#F87171' },
  pending:    { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C', dot: '#C9A84C' },
  confirmed:  { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA', dot: '#60A5FA' },
  in_transit: { bg: 'rgba(167,139,250,0.12)', text: '#A78BFA', dot: '#A78BFA' },
  delivered:  { bg: 'rgba(52,211,153,0.12)',  text: '#34D399', dot: '#34D399' },
  cancelled:  { bg: 'rgba(248,113,113,0.12)', text: '#F87171', dot: '#F87171' },
  open:       { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C', dot: '#C9A84C' },
  accepted:   { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA', dot: '#60A5FA' },
}

export default function StatusBadge({ status }: { status: string }) {
  const s = styles[status] ?? { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', dot: '#9CA3AF' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 9999,
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 700,
      textTransform: 'capitalize' as const,
      border: `1px solid ${s.dot}28`,
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
      {status.replace('_', ' ')}
    </span>
  )
}
