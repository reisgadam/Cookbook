/** A little index card with a heart; the same drawing as the favicon. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      <g transform="rotate(-6 32 32)">
        <rect x="11" y="15" width="42" height="34" rx="3.5" fill="#fbf6ee" />
        <path d="M11 23.5h42" stroke="#dc8f83" strokeWidth="1.8" />
        <path d="M15 30.5h34M15 36.5h34M15 42.5h34" stroke="#a9c1dc" strokeWidth="1.3" />
        <path
          d="M32 45c-5.4-3.7-8.3-6.7-8.3-9.8 0-2.3 1.8-4.1 4-4.1 1.8 0 3.2.9 4.3 2.5 1.1-1.6 2.5-2.5 4.3-2.5 2.2 0 4 1.8 4 4.1 0 3.1-2.9 6.1-8.3 9.8z"
          fill="#b5502f"
        />
      </g>
    </svg>
  );
}
