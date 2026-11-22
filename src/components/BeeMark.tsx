export function BeeMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round">
        <path d="M24 20 L18 12" />
        <path d="M40 20 L46 12" />
        <path d="M20 28 L11 25" />
        <path d="M44 28 L53 25" />
      </g>
      <ellipse cx="32" cy="38" rx="14" ry="18" fill="#F59E0B" />
      <g stroke="#0D0F14" strokeWidth="2.6" strokeLinecap="round">
        <line x1="32" y1="21" x2="32" y2="55" />
        <line x1="24.5" y1="23.5" x2="22.5" y2="52" />
        <line x1="39.5" y1="23.5" x2="41.5" y2="52" />
      </g>
      <circle cx="32" cy="17" r="6" fill="#1E222E" />
      <circle cx="30" cy="16.2" r="1.4" fill="#ECECF1" />
      <circle cx="34" cy="16.2" r="1.4" fill="#ECECF1" />
    </svg>
  );
}
