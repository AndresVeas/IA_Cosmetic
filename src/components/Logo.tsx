import React from 'react';

type LogoProps = {
  showTagline?: boolean;
  className?: string;
  alignment?: 'horizontal' | 'vertical';
};

export function LogoIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoGold" x1="68" y1="70" x2="105" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D2B477" />
          <stop offset="1" stopColor="#A9823F" />
        </linearGradient>
      </defs>

      <path d="M55 12C31 11 13 28 10 52c-3 27 12 47 35 56" stroke="#8C3D60" strokeWidth="4" strokeLinecap="round" />
      <path d="M55 18c-2 15-10 23-22 32-11 9-17 22-15 39" stroke="#8C3D60" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M57 19c-3 18-16 25-27 36-13 13-15 35 4 52" stroke="#8C3D60" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 20c5 8 6 17 5 25 0 5 4 9 10 14 3 3 2 6-2 8l-4 2c2 2 2 4 0 6 2 2 1 4-1 5-4 2-7 3-8 8-1 5 2 8 6 11" stroke="#8C3D60" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 48c4 3 8 3 12 0" stroke="#8C3D60" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M55 46v-3M60 47l2-3M51 47l-2-2" stroke="#8C3D60" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="66" cy="84" r="21" stroke="url(#logoGold)" strokeWidth="4" />
      <path d="M81 99l16 16" stroke="url(#logoGold)" strokeWidth="7" strokeLinecap="round" />
      <path d="M54 84c0-7 5-12 12-12" stroke="#8C3D60" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ showTagline = false, className = '', alignment = 'horizontal' }: LogoProps) {
  const isVertical = alignment === 'vertical';

  return (
    <div
      className={`${isVertical ? 'flex-col text-center' : 'flex-row'} flex shrink-0 items-center gap-2.5 ${className}`}
      aria-label="IA Cosmetic"
    >
      <LogoIcon className={`${isVertical ? 'h-20 w-20' : 'h-12 w-12'} shrink-0`} />
      <div className={`${isVertical ? 'items-center' : 'items-start'} flex flex-col justify-center`}>
        <div className="flex items-baseline whitespace-nowrap font-serif leading-none">
          <span className="text-[1.35rem] font-medium tracking-[0.2em] text-[#8C3D60]">IA</span>
          <span
            className="ml-3 bg-gradient-to-r from-[#B18B4B] via-[#D0B174] to-[#A77E38] bg-clip-text text-[1.35rem] font-normal tracking-[0.12em] text-transparent"
          >
            Cosmetic
          </span>
        </div>
        {showTagline && (
          <span className="mt-1.5 text-[7px] font-semibold uppercase tracking-[0.24em] text-[#8C3D60]/70">
            Ciencia inteligente para tu piel
          </span>
        )}
      </div>
    </div>
  );
}
