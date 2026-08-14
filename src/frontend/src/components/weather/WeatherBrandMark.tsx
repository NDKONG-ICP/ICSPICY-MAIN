/** Inline IC SPICY flame + wordmark for Weather Desk hero. */
export function WeatherBrandMark({ className }: { className?: string }) {
  return (
    <div className={className} data-ocid="weather-brand-mark">
      <div className="flex items-center gap-3">
        <svg
          viewBox="0 0 48 48"
          className="size-12 sm:size-14 drop-shadow-lg"
          aria-hidden
        >
          <circle cx="24" cy="24" r="24" fill="#c23b22" />
          <path
            d="M24 8c2 6-2 9-2 14 0 4 3 7 7 7 1-5 5-8 5-14 6 5 8 12 8 18 0 8-6 13-14 13S14 41 14 33c0-8 5-16 10-25z"
            fill="#fff8f0"
          />
          <path
            d="M22 28c0 3 2 5 5 5-1-3 1-5 1-8-3 1-6 2-6 3z"
            fill="#ff6b35"
            opacity="0.9"
          />
        </svg>
        <div>
          <p className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none">
            <span className="text-white">IC </span>
            <span className="text-[#e23d2a]">SPICY</span>
          </p>
          <p className="mt-1 font-display text-[11px] sm:text-xs font-semibold uppercase tracking-[0.28em] text-[var(--wd-citrus)]">
            Weather Desk
          </p>
        </div>
      </div>
    </div>
  );
}
