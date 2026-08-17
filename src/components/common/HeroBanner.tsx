import React from 'react';

interface HeroBannerProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle,
  children,
  className = '',
  compact = false,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[16px] bg-slate-900 text-white shadow-xs border border-slate-800 ${
        compact ? 'p-4 sm:p-5 min-h-[90px]' : 'p-5 sm:p-6 min-h-[110px]'
      } flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      {/* Subtle Background Accent Lines (Less saturated & lighter) */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md pointer-events-none opacity-25 overflow-hidden flex justify-end">
        <svg
          viewBox="0 0 360 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-auto object-right"
        >
          <line x1="40" y1="0" x2="320" y2="160" stroke="#94A3B8" strokeWidth="0.75" />
          <line x1="120" y1="0" x2="360" y2="160" stroke="#64748B" strokeWidth="0.75" />
          <line x1="0" y1="40" x2="360" y2="140" stroke="#475569" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Left Content Area */}
      <div className="relative z-10 space-y-0.5 max-w-xl">
        <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-white leading-snug">
          {title}
        </h2>
        <p className="text-[12px] text-slate-300 font-normal leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Right Content / Metrics Slot */}
      {children && (
        <div className="relative z-10 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};
