const iconPaths = {
  bag: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  fork: <><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M17 3v7M14 3v4a3 3 0 0 0 6 0V3M17 10v11" /></>,
  star: <path d="m12 3 2.65 5.37L20.58 9.2l-4.29 4.18 1.01 5.9L12 16.5l-5.3 2.78 1.01-5.9L3.42 9.2l5.93-.83L12 3Z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  filter: <path d="M4 5h16l-6.3 7v5l-3.4 2v-7L4 5Z" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  trash: <><path d="M5 7h14M10 11v5M14 11v5M8 7l1 13h6l1-13M10 7V4h4v3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="M5 12h13M13 6l6 6-6 6" />,
  trending: <><path d="m5 17 5-5 3 3 6-7" /><path d="M14 8h5v5" /></>,
}

export function MenuIcon({ name, size = 22, strokeWidth = 1.8 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>
}

export function ProductIllustration({ product, size = 'large' }) {
  const label = `${product.name || ''} ${product.category || ''}`.toLowerCase()
  const kind = /kopi|coffee/.test(label) ? 'coffee' : /teh|tea|drink/.test(label) ? 'drink' : /karipap|snack|puff/.test(label) ? 'snack' : 'meal'
  const compact = size === 'small'
  const dimensions = compact ? 46 : 180

  return <div aria-label={`${product.name} illustration`} role="img" style={{ width: dimensions, height: dimensions, display: 'grid', placeItems: 'center', borderRadius: compact ? 10 : 28, background: '#fff4e9', flexShrink: 0 }}>
    <svg width={compact ? 34 : 126} height={compact ? 34 : 126} viewBox="0 0 160 160" fill="none" aria-hidden="true">
      {kind === 'coffee' && <><path d="M42 67h64v28c0 22-14 36-32 36S42 117 42 95V67Z" fill="#165634" /><path d="M106 79h16c11 0 13 26-1 28h-15" stroke="#123c28" strokeWidth="7" strokeLinecap="round" /><path d="M51 69c16-8 38-8 53 0-10 8-42 8-53 0Z" fill="#432b1a" /><path d="M67 48c-9-7 6-14 1-23M84 47c-9-7 6-14 1-23M101 47c-9-7 6-14 1-23" stroke="#955d2a" strokeWidth="6" strokeLinecap="round" /><path d="M25 139h110" stroke="#123c28" strokeWidth="8" strokeLinecap="round" /></>}
      {kind === 'drink' && <><path d="M51 41c5 12 16 17 29 17s25-5 30-17" stroke="#e98142" strokeWidth="6" strokeLinecap="round" /><path d="M54 52h54l-8 71c-1 10-7 15-19 15H80c-12 0-18-5-19-15l-7-71Z" fill="#c84d11" /><path d="M63 58h36l-4 55H68l-5-55Z" fill="#e87327" /><path d="M66 60c10-8 23-8 34 0-6 11-29 11-34 0Z" fill="#f8e7d5" /><circle cx="78" cy="62" r="4" fill="white" /><circle cx="91" cy="65" r="3" fill="white" /></>}
      {kind === 'snack' && <><path d="m38 112 38-66c2-4 7-4 9 0l38 66c2 4-1 9-6 9H44c-5 0-8-5-6-9Z" fill="#d6802f" /><path d="m51 108 29-51 29 51H51Z" fill="#f3bb63" /><path d="M58 115c13-10 31-10 45 0" stroke="#96511d" strokeWidth="5" strokeLinecap="round" /><path d="M72 78c5 3 10 3 15 0" stroke="#96511d" strokeWidth="4" strokeLinecap="round" /></>}
      {kind === 'meal' && <><path d="M34 91c8 32 25 44 46 44s38-12 46-44H34Z" fill="#f2a53b" /><path d="M34 91c16-18 76-18 92 0-12 14-80 14-92 0Z" fill="#fff5df" /><path d="M56 82c7-17 18-20 25-5 7-17 19-13 23 3" stroke="#4e8b49" strokeWidth="10" strokeLinecap="round" /><circle cx="74" cy="89" r="5" fill="#d75b3b" /><circle cx="95" cy="91" r="5" fill="#d75b3b" /><path d="M28 136h104" stroke="#c76f28" strokeWidth="7" strokeLinecap="round" /></>}
    </svg>
  </div>
}

