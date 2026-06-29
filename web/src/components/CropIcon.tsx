interface Props { type: string; className?: string }

export function CropIcon({ type, className = 'w-5 h-5' }: Props) {
  const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, className }
  switch (type.toLowerCase()) {
    case 'maize':    return <MaizeIcon    {...base} />
    case 'tomatoes': return <TomatoIcon   {...base} />
    case 'plantain': return <PlantainIcon {...base} />
    case 'cassava':  return <CassavaIcon  {...base} />
    case 'pepper':   return <PepperIcon   {...base} />
    case 'rice':     return <RiceIcon     {...base} />
    default:         return <DefaultCropIcon {...base} />
  }
}

type SvgProps = React.SVGProps<SVGSVGElement>

function MaizeIcon(p: SvgProps) {
  return (
    <svg {...p}>
      {/* Cob body */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 5C9.5 3 14.5 3 14.5 5L14.5 17C14.5 19 9.5 19 9.5 17Z" />
      {/* Kernel rows */}
      <line x1="9.5" y1="9"  x2="14.5" y2="9"  strokeWidth="0.8" />
      <line x1="9.5" y1="12" x2="14.5" y2="12" strokeWidth="0.8" />
      <line x1="9.5" y1="15" x2="14.5" y2="15" strokeWidth="0.8" />
      {/* Husk leaves */}
      <path strokeLinecap="round" d="M9.5 8C7 6 4 8 6 12" />
      <path strokeLinecap="round" d="M14.5 8C17 6 20 8 18 12" />
    </svg>
  )
}

function TomatoIcon(p: SvgProps) {
  return (
    <svg {...p}>
      <circle cx="12" cy="14" r="6" />
      {/* Stem */}
      <path strokeLinecap="round" d="M12 8L12 5" />
      {/* Calyx leaves */}
      <path strokeLinecap="round" d="M9.5 7C9 4 11 5 12 5" />
      <path strokeLinecap="round" d="M14.5 7C15 4 13 5 12 5" />
    </svg>
  )
}

function PlantainIcon(p: SvgProps) {
  return (
    <svg {...p}>
      {/* First finger */}
      <path strokeLinecap="round" d="M5 19C5 16 7 11 11 8C14 5 18 5 19 8C20 11 18 15 14 18" />
      {/* Second finger */}
      <path strokeLinecap="round" d="M7 20C7 17 9 13 12 10.5C14.5 8 17.5 8 18.5 10.5" />
      {/* Bunch stem */}
      <path strokeLinecap="round" d="M11 8L9.5 5" />
    </svg>
  )
}

function CassavaIcon(p: SvgProps) {
  return (
    <svg {...p}>
      {/* Leaf stems from top */}
      <path strokeLinecap="round" d="M12 2C10 3 8 5 9 8" />
      <path strokeLinecap="round" d="M12 2C14 3 16 5 15 8" />
      {/* Tuber node */}
      <ellipse cx="12" cy="10" rx="3" ry="2" />
      {/* Taproot fingers */}
      <path strokeLinecap="round" d="M9 12C8 15 7 18 8 21" />
      <path strokeLinecap="round" d="M12 12L12 22" />
      <path strokeLinecap="round" d="M15 12C16 15 17 18 16 21" />
    </svg>
  )
}

function PepperIcon(p: SvgProps) {
  return (
    <svg {...p}>
      {/* Body */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5C14.5 5 17 8 17 12C17 17 14.5 21 12 21C9.5 21 7 17 7 12C7 8 9.5 5 12 5Z" />
      {/* Stem */}
      <path strokeLinecap="round" d="M12 5L12 2" />
      {/* Leaf */}
      <path strokeLinecap="round" d="M12 3C13 1 16 2 14.5 4" />
    </svg>
  )
}

function RiceIcon(p: SvgProps) {
  return (
    <svg {...p}>
      {/* Bowl */}
      <path strokeLinecap="round" d="M4 11L20 11" />
      <path strokeLinecap="round" d="M4 11C4 16 8 20 12 20C16 20 20 16 20 11" />
      {/* Rice grains above bowl */}
      <ellipse cx="8.5"  cy="8" rx="1.5" ry="0.8" transform="rotate(-30 8.5 8)" />
      <ellipse cx="12"   cy="7" rx="1.5" ry="0.8" />
      <ellipse cx="15.5" cy="8" rx="1.5" ry="0.8" transform="rotate(30 15.5 8)" />
    </svg>
  )
}

function DefaultCropIcon(p: SvgProps) {
  return (
    <svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12m0 0c0-4 4-8 7-6 1 4-2 8-7 6zm0 0c0-4-4-8-7-6-1 4 2 8 7 6z" />
    </svg>
  )
}
