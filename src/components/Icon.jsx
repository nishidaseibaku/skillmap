/** 線画アイコン。stroke は currentColor を使い、文字色に追従させる */
const PATHS = {
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 21v-4h6v4M8 7h2M8 11h2M14 7h2M14 11h2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.4M17.5 15.4c1.7.7 2.7 2.2 3 4.1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20.5c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 13h4.5l1.5 2.5h4L15.5 13H20" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  sync: (
    <>
      <path d="M20 8.5A8 8 0 0 0 5.5 6L4 8" />
      <path d="M4 4v4h4M4 15.5A8 8 0 0 0 18.5 18l1.5-2" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13.5h9l1-13.5" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  pencil: (
    <>
      <path d="m4 20 .8-3.8L17 4l3 3L7.8 19.2z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4H6v16h8" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  sparkle: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </>
  ),
  check: <path d="m5 13 4.5 4.5L19 7" />,
};

export default function Icon({ name, size = 18, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
