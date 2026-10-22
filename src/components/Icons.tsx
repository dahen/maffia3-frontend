export function Icon({ name, size = 16 }: { name: 'leaf' | 'chat' | 'back' | 'forward' | 'close' | 'history' | 'play' | 'settings' | 'download'; size?: number }) {
  const paths = { leaf: 'M20 4C9 3 3 7 5 14c1 5 9 6 12 2 3-4 3-12 3-12ZM4 21 16 9', chat: 'M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z', back: 'm14 6-6 6 6 6', forward: 'm10 6 6 6-6 6', close: 'm6 6 12 12M18 6 6 18', history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2', play: 'm8 4 12 8-12 8Z', settings: 'M4 7h16M4 17h16M9 4v6m6 4v6', download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
