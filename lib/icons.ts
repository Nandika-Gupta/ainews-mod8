/** Lucide-style line glyphs, 1.75 stroke — used by <Icon />. */
export const ICONS = {
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M18 13l-6 6-6-6",
  external: "M7 17 17 7M9 7h8v8",
  chevronR: "M9 6l6 6-6 6",
  chevronL: "M15 6l-6 6 6 6",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-3.5-3.5",
  refresh: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5 5h14l3 7v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6Z",
  flame: "M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.5-2 1-2.5C9 10 9 6 12 3ZM10 15a2 2 0 1 0 4 0",
  bookmark: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z",
  filter: "M3 5h18M6 12h12M10 19h4",
  check: "M4 12l5 5L20 6",
  chevronD: "M6 9l6 6 6-6",
  x: "M6 6l12 12M18 6L6 18",
  user: "M4 20a8 8 0 0 1 16 0M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  newspaper: "M4 5h13a1 1 0 0 1 1 1v13a2 2 0 0 0 2-2V8M4 5a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h13M7 9h7M7 13h7M7 17h4",
} as const;

export type IconKey = keyof typeof ICONS;
