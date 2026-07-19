const iconPaths = {
  dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  orders: <><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0M9 12h6" /></>,
  kitchen: <><path d="M6 12h12v7H6z" /><path d="M8 12V9a4 4 0 0 1 8 0v3M4 12h16" /></>,
  inventory: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
  advisor: <><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M9 8V5m6 3V5M9 13h.01M15 13h.01M9 17v2m6-2v2" /></>,
  marketing: <><path d="m4 11 13-5v12L4 13v-2Z" /><path d="M17 9h2a2 2 0 0 1 0 4h-2M6 14l1 5h3l-1-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.6 3h-4l-.4 3.1a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L6.1 11a7 7 0 0 0 0 2l-1.9 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 3.1h4l.4-3.1a7 7 0 0 0 1.7-1l2.3 1 2-3.4-1.9-1.5c.1-.3.1-.7.1-1Z" /></>,
  layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
  bell: <><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" /></>,
  menu: <path d="m5 12 5 5L20 7" />,
  close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>,
  spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0 1 4" /><path d="M20 4v7h-7" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />,
}

function VendorIcon({ name, size = 23, strokeWidth = 1.8 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>
}

export default VendorIcon