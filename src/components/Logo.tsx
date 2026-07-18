import React from 'react';

export function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} flex-shrink-0`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Outer elegant hair curve */}
      <path
        d="M 32 72 C 20 60 18 36 34 22 C 45 10 58 16 63 21"
        stroke="currentColor"
        className="text-brand-dusty-rose"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      
      {/* Inner hair curves - thick elegant stroke */}
      <path
        d="M 35 65 C 27 50 31 33 42 24"
        stroke="currentColor"
        className="text-brand-plum"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 38 70 C 31 55 36 41 45 31"
        stroke="currentColor"
        className="text-brand-plum/70"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Face Profile line (Nose, Lips, Chin, Neck) */}
      <path
        d="M 48 24 C 52 27 53 30 51 32 C 53 33 55 35 53 38 C 52 40 50 40 49 41 C 50 43 51 45 49 46 C 45 48 42 47 40 55 C 38 60 39 65 42 70"
        stroke="currentColor"
        className="text-brand-plum"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Closed eye / eyelash */}
      <path
        d="M 45 32 Q 47 33 49 32"
        stroke="currentColor"
        className="text-brand-plum"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Magnifying Glass (Thin circle & handle) */}
      <circle
        cx="58"
        cy="51"
        r="11"
        stroke="currentColor"
        className="text-brand-dusty-rose"
        strokeWidth="1.5"
        fill="white"
        fillOpacity="0.05"
      />
      <rect
        x="65"
        y="58"
        width="3"
        height="8"
        rx="1.5"
        transform="rotate(-45 65 58)"
        fill="currentColor"
        className="text-brand-plum"
      />

      {/* Connected nodes (Constellation representing U-Net/AI Skin logic) inside glass */}
      <circle cx="53" cy="52" r="1" fill="currentColor" className="text-brand-dusty-rose" />
      <circle cx="59" cy="47" r="1" fill="currentColor" className="text-brand-dusty-rose" />
      <circle cx="62" cy="53" r="1" fill="currentColor" className="text-brand-dusty-rose" />
      <circle cx="57" cy="56" r="1" fill="currentColor" className="text-brand-dusty-rose" />
      
      <line x1="53" y1="52" x2="59" y2="47" stroke="currentColor" className="text-brand-dusty-rose/30" strokeWidth="0.5" />
      <line x1="59" y1="47" x2="62" y2="53" stroke="currentColor" className="text-brand-dusty-rose/30" strokeWidth="0.5" />
      <line x1="62" y1="53" x2="57" y2="56" stroke="currentColor" className="text-brand-dusty-rose/30" strokeWidth="0.5" />
      <line x1="57" y1="56" x2="53" y2="52" stroke="currentColor" className="text-brand-dusty-rose/30" strokeWidth="0.5" />
      <line x1="53" y1="52" x2="62" y2="53" stroke="currentColor" className="text-brand-dusty-rose/30" strokeWidth="0.5" />

      {/* Sparkles / Stars */}
      {/* Sparkle inside the magnifying glass */}
      <path
        d="M 55 43 L 56 44 L 55 45 L 54 44 Z"
        fill="currentColor"
        className="text-brand-accent"
      />
      {/* Large star in upper right */}
      <path
        d="M 64 31 L 65 32.5 L 66 31 L 65 29.5 Z"
        fill="currentColor"
        className="text-brand-dusty-rose"
      />
      {/* Small star below it */}
      <path
        d="M 66 37 L 66.5 38 L 67 37 L 66.5 36 Z"
        fill="currentColor"
        className="text-brand-dusty-rose/70"
      />
      {/* Tiny dot */}
      <circle cx="69" cy="34" r="0.8" fill="currentColor" className="text-brand-accent" />
    </svg>
  );
}

export default function Logo({ showTagline = false, className = "", alignment = "horizontal" }: { showTagline?: boolean, className?: string, alignment?: "horizontal" | "vertical" }) {
  if (alignment === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center gap-3 shrink-0 ${className}`}>
        <LogoIcon className="w-20 h-20 text-brand-plum flex-shrink-0" />
        <div className="flex flex-col items-center">
          <div className="font-serif text-2xl tracking-[0.15em] font-light leading-none flex items-center gap-1.5">
            <span className="text-brand-plum font-bold">IA</span>
            <span className="text-brand-accent font-light tracking-[0.2em] ml-1">COSMETIC</span>
          </div>
          {/* Elegant star divider from user image */}
          <div className="flex items-center justify-center w-36 my-3 gap-2">
            <div className="h-[0.5px] bg-brand-dusty-rose/35 flex-1"></div>
            <span className="text-brand-accent text-xs">✦</span>
            <div className="h-[0.5px] bg-brand-dusty-rose/35 flex-1"></div>
          </div>
          {showTagline && (
            <span className="text-[8px] tracking-[0.25em] uppercase font-sans text-brand-plum/80 font-bold">
              CIENCIA INTELIGENTE PARA TU PIEL
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <LogoIcon className="w-12 h-12 text-brand-plum flex-shrink-0" />
      <div className="flex flex-col justify-center">
        <div className="font-serif text-lg tracking-[0.12em] font-light leading-none flex items-center">
          <span className="text-brand-plum font-bold">IA</span>
          <span className="text-brand-accent font-light tracking-[0.18em] ml-2">COSMETIC</span>
        </div>
        {showTagline && (
          <span className="text-[6.5px] tracking-[0.25em] uppercase font-sans text-brand-plum/70 font-semibold mt-1">
            CIENCIA INTELIGENTE PARA TU PIEL
          </span>
        )}
      </div>
    </div>
  );
}
