import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  highlight?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  change,
  changeType = 'neutral',
  icon,
  action,
  highlight = false,
}) => {
  return (
    <div
      className={`rounded-[14px] p-5 transition-all flex flex-col justify-between min-w-0 ${
        highlight
          ? 'bg-slate-900 text-white border border-slate-800 shadow-sm'
          : 'bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300'
      }`}
    >
      <div className="space-y-2.5">
        {/* Label & Optional Subtle Icon Row */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className={`text-[12px] font-medium truncate tracking-normal ${
              highlight ? 'text-slate-300' : 'text-slate-500'
            }`}
            title={label}
          >
            {label}
          </span>
          {icon && (
            <div className={`flex-shrink-0 text-[13px] ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>
              {icon}
            </div>
          )}
        </div>

        {/* Primary Metric Value */}
        <div
          className={`text-[22px] sm:text-[24px] font-bold tracking-tight tabular-nums truncate leading-none ${
            highlight ? 'text-white' : 'text-slate-900'
          }`}
          title={value}
        >
          {value}
        </div>
      </div>

      {/* Footer / Change Indicator / Subtext */}
      {(change || subtext || action) && (
        <div className="mt-4 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] min-w-0">
          {change ? (
            <span
              className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                changeType === 'positive'
                  ? 'text-emerald-600'
                  : changeType === 'negative'
                  ? 'text-rose-600'
                  : highlight
                  ? 'text-slate-300'
                  : 'text-slate-500'
              }`}
            >
              {changeType === 'positive' && <ArrowUp className="w-3 h-3 stroke-[2.5]" />}
              {changeType === 'negative' && <ArrowDown className="w-3 h-3 stroke-[2.5]" />}
              <span>{change}</span>
            </span>
          ) : (
            <span className={`truncate ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>
              {subtext}
            </span>
          )}

          {action && (
            <button
              onClick={action.onClick}
              className={`font-semibold hover:underline flex items-center gap-0.5 cursor-pointer flex-shrink-0 ml-auto ${
                highlight ? 'text-blue-300' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
