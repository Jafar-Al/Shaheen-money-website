/**
 * Interface icons: 24×24 grid, 1.75 stroke, round caps and joins — one
 * weight and one grid for the whole set (audit E.2). Inner SVG markup only;
 * rendered by Icon.astro.
 */
export const icons = {
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  'shield-check':
    '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3z"/><path d="m8.8 12.2 2.2 2.2 4.3-4.3"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6z"/>',
  'map-pin': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>',
  alert:
    '<path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17v.2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  receive:
    '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
  wallet:
    '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a1 1 0 0 1 1 1v2.5"/><rect x="4" y="7.5" width="16" height="12" rx="2.5"/><path d="M16 13.5h.2"/>',
  send: '<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4 17-6.5z"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v.2M17.5 14.3v.2"/>',
  store:
    '<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M4 9.5c0 1.4 1.1 2.5 2.5 2.5S9 10.9 9 9.5c0 1.4 1.1 2.5 2.5 2.5h1c1.4 0 2.5-1.1 2.5-2.5 0 1.4 1.1 2.5 2.5 2.5S20 10.9 20 9.5"/><path d="M5.5 12v7.5h13V12M10 19.5v-4h4v4"/>',
  users:
    '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.4c2.1.7 3.5 2.8 3.5 5.6"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  chat: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-5 4v-15.5z"/>',
  news:
    '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16a1.5 1.5 0 0 1 1.5 1.5V19a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2V5.5z"/><path d="M17.5 9H20v9a2 2 0 0 1-2 2M8 8.5h6M8 12h6M8 15.5h4"/>',
  bug:
    '<rect x="7.5" y="8" width="9" height="12" rx="4.5"/><path d="M12 8v12M9 5.5 10.5 8M15 5.5 13.5 8M4 12h3.5M16.5 12H20M4.5 17.5l3.1-1.5M19.5 17.5l-3.1-1.5M4.5 7.5l3.2 1.7M19.5 7.5l-3.2 1.7"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16.5 6.5l2.5 2.5M14 9l2 2"/>',
  building: '<path d="M4 20.5V5a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 15 5v15.5M15 9.5h3.5A1.5 1.5 0 0 1 20 11v9.5M2.5 20.5h19M7.5 7.5h4M7.5 11h4M7.5 14.5h4"/>',
} as const;

export type IconName = keyof typeof icons;
