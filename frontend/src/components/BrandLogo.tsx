interface BrandLogoProps {
  size?: "compact" | "large";
}

export function BrandLogo({ size = "compact" }: BrandLogoProps) {
  return (
    <div className={`brand-logo brand-logo-${size}`} role="img" aria-label="FinBuddy">
      <svg className="brand-logo-mark" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="1" y="1" width="46" height="46" rx="15" fill="#17443d" />
        <path d="M11 31.5 19.2 23l6.2 5.6L36.5 16" fill="none" stroke="#f5fbf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 37h25" fill="none" stroke="#72c4a6" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="36.5" cy="16" r="4.2" fill="#e7bd67" stroke="#17443d" strokeWidth="1.5" />
      </svg>
      <span className="brand-logo-wordmark"><span>Fin</span><span>Buddy</span></span>
    </div>
  );
}
