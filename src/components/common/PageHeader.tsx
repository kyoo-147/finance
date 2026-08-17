import React from 'react';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface PageHeaderBadge {
  text: string;
  variant?: 'amber' | 'blue' | 'green' | 'neutral';
  pulse?: boolean;
}

export interface PageHeaderProps {
  periodLabel?: string;
  badge?: PageHeaderBadge;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  extraMeta?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  periodLabel,
  badge,
  title,
  subtitle,
  actions,
  extraMeta,
}) => {
  return (
    <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-r from-white via-[#F8FAFD] to-[#F4F7FF] border border-[#E2E8F3] border-l-4 border-l-[#1547F5] p-5 sm:p-6 shadow-[0_2px_8px_rgba(8,18,61,0.03)] transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Metadata + Title + Subtitle */}
        <div className="space-y-1">
          {/* Eyebrow / Metadata Row */}
          {(periodLabel || badge || extraMeta) && (
            <div className="flex flex-wrap items-center gap-2 text-[12px] mb-1">
              {periodLabel && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#5E6A8A]">
                  <Calendar className="w-3.5 h-3.5 text-[#1547F5]" />
                  {periodLabel}
                </span>
              )}

              {periodLabel && (badge || extraMeta) && (
                <span className="text-[#C1C9D9] font-normal">•</span>
              )}

              {badge && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                    badge.variant === 'amber' || !badge.variant
                      ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]/80'
                      : badge.variant === 'blue'
                      ? 'bg-[#EEF3FF] text-[#1547F5] border-[#1547F5]/20'
                      : badge.variant === 'green'
                      ? 'bg-[#E9F8F0] text-[#16A35A] border-[#16A35A]/20'
                      : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  {badge.pulse && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        badge.variant === 'green'
                          ? 'bg-[#16A35A]'
                          : badge.variant === 'blue'
                          ? 'bg-[#1547F5]'
                          : badge.variant === 'neutral'
                          ? 'bg-[#64748B]'
                          : 'bg-[#D97706]'
                      }`}
                    />
                  )}
                  {badge.text}
                </span>
              )}

              {extraMeta}
            </div>
          )}

          {/* Main Title */}
          <h1 className="text-[21px] sm:text-[23px] font-extrabold text-[#08123D] tracking-tight leading-snug">
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-[12.5px] text-[#5E6A8A] max-w-2xl font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Side: Action Buttons / Controls */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center md:ml-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
