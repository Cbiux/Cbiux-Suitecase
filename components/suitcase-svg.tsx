type SuitcaseSvgProps = {
  face: "front" | "back" | "left" | "right";
  className?: string;
};

export function SuitcaseSvg({ face, className }: SuitcaseSvgProps) {
  const side = face === "left" || face === "right";
  const mirrored = face === "right" || face === "back";

  if (side) {
    return (
      <svg
        viewBox="0 0 400 600"
        className={className}
        aria-hidden="true"
        style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
      >
        <defs>
          <linearGradient id={`side-body-${face}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="40%" stopColor="#111" />
            <stop offset="100%" stopColor="#1c1c1c" />
          </linearGradient>
        </defs>
        <rect x="176" y="14" width="48" height="12" rx="2" fill="#3a3a3a" />
        <rect x="168" y="26" width="64" height="62" rx="11" fill="none" stroke="#555" strokeWidth="11" />
        <rect x="122" y="90" width="156" height="428" rx="30" fill={`url(#side-body-${face})`} stroke="#4a4a4a" strokeWidth="3" />
        <rect x="136" y="106" width="128" height="396" rx="20" fill="none" stroke="#2c2c2c" />
        <path d="M148 148 H248" stroke="#333" />
        <path d="M148 248 H248" stroke="#333" />
        <path d="M148 428 H248" stroke="#333" />
        <rect x="150" y="166" width="14" height="46" rx="2" fill="#2f2f2f" />
        <rect x="150" y="386" width="14" height="46" rx="2" fill="#2f2f2f" />
        <rect x="148" y="508" width="40" height="24" rx="7" fill="#3a3a3a" />
        <rect x="212" y="508" width="40" height="24" rx="7" fill="#3a3a3a" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 600" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`front-body-${face}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b2b2b" />
          <stop offset="48%" stopColor="#0c0c0c" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>
      <rect x="176" y="10" width="48" height="14" rx="2" fill="#3a3a3a" />
      <rect x="152" y="22" width="96" height="54" rx="13" fill="none" stroke="#5a5a5a" strokeWidth="11" />
      <rect x="82" y="80" width="236" height="448" rx="38" fill={`url(#front-body-${face})`} stroke="#4a4a4a" strokeWidth="3.5" />
      <rect x="100" y="98" width="200" height="412" rx="26" fill="none" stroke="#2a2a2a" />
      <rect x="96" y="102" width="6" height="404" rx="3" fill="#262626" />
      <rect x="298" y="102" width="6" height="404" rx="3" fill="#262626" />
      <path d="M116 148 H284" stroke="#2a2a2a" />
      <path d="M116 468 H284" stroke="#2a2a2a" />
      <rect x="114" y="520" width="44" height="26" rx="8" fill="#3a3a3a" />
      <rect x="242" y="520" width="44" height="26" rx="8" fill="#3a3a3a" />
    </svg>
  );
}
