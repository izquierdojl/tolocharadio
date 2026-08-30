export function SierraEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Emblema de TolochaRadio"
    >
      <defs>
        <linearGradient id="emblem-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--emblem-badge-a)" />
          <stop offset="100%" stopColor="var(--emblem-badge-b)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#emblem-sky)" />
      <circle cx="16" cy="15" r="6.5" fill="var(--emblem-sun)" />
      <path d="M0 64 L14 34 L26 50 L40 26 L64 58 L64 64 Z" fill="var(--color-pine-600)" />
      <line x1="40" y1="27" x2="40" y2="12" stroke="var(--emblem-sun)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="9.5" r="3" fill="var(--emblem-sun)" />
      <path
        d="M 34 8 A 6 6 0 0 1 40 2"
        fill="none"
        stroke="var(--emblem-line)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 32 8 A 8 8 0 0 1 40 0"
        fill="none"
        stroke="var(--emblem-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}