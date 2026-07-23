// 3-color status language: state is carried by *structure*, not hue —
// solid brand pill = done/positive, soft pill = in progress, outlined = waiting,
// inverted = attention, strikethrough = dead. Dot + label always present.
type Look = 'solid' | 'soft' | 'outline' | 'invert' | 'dead'

const looks: Record<string, Look> = {
  active:          'soft',
  delivered:       'solid',
  sold:            'solid',
  pending_payment: 'outline',
  pending:         'outline',
  open:            'outline',
  confirmed:       'soft',
  accepted:        'soft',
  in_transit:      'soft',
  expired:         'dead',
  cancelled:       'dead',
}

const classByLook: Record<Look, string> = {
  solid:   'badge badge-solid',
  soft:    'badge badge-soft',
  outline: 'badge badge-outline',
  invert:  'badge badge-invert',
  dead:    'badge badge-outline',
}

export default function StatusBadge({ status }: { status: string }) {
  const look = looks[status] ?? 'outline'
  return (
    <span
      className={classByLook[look]}
      style={{
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        fontSize: 11,
        ...(look === 'dead' ? { textDecoration: 'line-through', opacity: 0.65 } : {}),
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'currentColor', flexShrink: 0, display: 'inline-block',
      }} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}
