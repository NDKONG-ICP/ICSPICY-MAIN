/** Custom category icons for Winter Grow — fire/ice tiles, not emoji. */

export function IconMostPeppers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M14 30c-2 4 0 8 4 9 3 1 6-1 7-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M18 28c1-6 5-12 10-14 1 5-1 11-5 15"
        fill="#e11d2e"
        stroke="#7f1d1d"
        strokeWidth="1"
      />
      <path
        d="M26 28c1-7 6-13 12-14 0 6-3 12-8 16"
        fill="#dc2626"
        stroke="#7f1d1d"
        strokeWidth="1"
      />
      <path
        d="M22 26c2-8 8-12 13-11-1 6-4 11-9 14"
        fill="#f87171"
        opacity="0.9"
      />
      <path
        d="M28 12c2-3 5-3 6-1"
        stroke="#84cc16"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconLargestPepper({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M24 14c8 2 14 10 12 18-2 8-10 12-16 10S8 32 10 24c2-7 8-12 14-10Z"
        fill="#e11d2e"
        stroke="#7f1d1d"
        strokeWidth="1.5"
      />
      <path
        d="M22 16c4 6 3 14-1 18"
        stroke="#450a0a"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M24 10c0-3 3-5 6-4-1 3-3 5-6 5Z"
        fill="#84cc16"
        stroke="#3f6212"
        strokeWidth="1"
      />
      <circle cx="34" cy="14" r="2" fill="#fbbf24" opacity="0.9" />
    </svg>
  );
}

export function IconTotalWeight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="8"
        y="18"
        width="32"
        height="20"
        rx="3"
        fill="#111"
        stroke="#fbbf24"
        strokeWidth="1.8"
      />
      <rect x="12" y="22" width="24" height="8" rx="1.5" fill="#1f2937" />
      <text
        x="24"
        y="28.5"
        textAnchor="middle"
        fill="#b8ff3c"
        fontSize="7"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
      >
        0.0
      </text>
      <path d="M16 14h16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 14v4" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="18" cy="34" r="2.2" fill="#e11d2e" />
      <circle cx="24" cy="35" r="2.5" fill="#dc2626" />
      <circle cx="30" cy="34" r="2" fill="#f87171" />
    </svg>
  );
}

export function IconLargestPlant({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="16" y="32" width="16" height="10" rx="2" fill="#1a1a1a" stroke="#444" />
      <path
        d="M24 32V18"
        stroke="#65a30d"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M24 22c-6-2-9-8-8-12 6 1 10 6 10 12"
        fill="#84cc16"
        opacity="0.95"
      />
      <path
        d="M24 20c6-1 10-7 9-12-5 2-9 7-9 12"
        fill="#a3e635"
        opacity="0.9"
      />
      <path
        d="M24 26c-5 1-7 6-5 9 4-1 6-4 6-8"
        fill="#65a30d"
      />
      <circle cx="20" cy="16" r="1.5" fill="#e11d2e" />
      <circle cx="29" cy="14" r="1.3" fill="#ef4444" />
    </svg>
  );
}
