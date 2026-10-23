const paths = {
  layers: 'm3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5',
  close: 'm6 6 12 12M18 6 6 18',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  back: 'm15 5-7 7 7 7',
  legend: 'M5 5h3v3H5ZM12 6h8M5 12h3v3H5ZM12 13h8M5 19h3v3H5ZM12 20h8',
  pin: 'M19 9c0 5-7 13-7 13S5 14 5 9a7 7 0 1 1 14 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  reset: 'M4 9V4h5M4 4l4 4a7 7 0 1 1-2 8',
}

export function ExploreMapIcon({ name }: { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
