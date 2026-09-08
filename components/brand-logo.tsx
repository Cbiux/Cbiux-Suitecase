export function BrandLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="7" y="8" width="18" height="20" rx="4.5" fill="currentColor" />
      <rect
        x="12.5"
        y="4"
        width="7"
        height="5"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect x="11" y="14" width="10" height="2.2" rx="1.1" className="fill-primary" />
      <rect x="11" y="18.5" width="10" height="2.2" rx="1.1" className="fill-primary" />
    </svg>
  );
}
