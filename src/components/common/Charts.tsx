import React, { useState } from 'react';

interface AreaLineChartProps {
  data: { label: string; value: number; value2?: number }[];
  height?: number;
  formatValue?: (val: number) => string;
  lineColor?: string;
  lineColor2?: string;
}

export const AreaLineChart: React.FC<AreaLineChartProps> = ({
  data,
  height = 180,
  formatValue = (v) => `$${(v / 100).toLocaleString()}`,
  lineColor = '#1547F5',
  lineColor2 = '#16A35A',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.value2 || 0)), 100);
  const minVal = Math.min(0, ...data.map((d) => Math.min(d.value, d.value2 || 0)));
  const range = maxVal - minVal || 1;

  const padding = 30;
  const width = 600;
  const chartHeight = height - padding;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 60) + 30;
    const y = chartHeight - ((d.value - minVal) / range) * (chartHeight - 20);
    return { x, y, val: d.value, label: d.label };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  let points2: { x: number; y: number; val: number }[] = [];
  let pathD2 = '';
  if (data.some((d) => d.value2 !== undefined)) {
    points2 = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 60) + 30;
      const val2 = d.value2 || 0;
      const y = chartHeight - ((val2 - minVal) / range) * (chartHeight - 20);
      return { x, y, val: val2 };
    });
    pathD2 = points2.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  }

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio, i) => (
          <line
            key={i}
            x1="30"
            y1={chartHeight * ratio}
            x2={width - 30}
            y2={chartHeight * ratio}
            stroke="#E7EBF3"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Main Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Secondary Line if present */}
        {pathD2 && <path d={pathD2} fill="none" stroke={lineColor2} strokeWidth="2" strokeDasharray="3 3" />}

        {/* Interactive Hover Dots */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? '6' : '3.5'}
              fill={hoverIndex === i ? lineColor : '#FFFFFF'}
              stroke={lineColor}
              strokeWidth="2"
              className="transition-all"
            />
          </g>
        ))}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          const x = (i / (data.length - 1)) * (width - 60) + 30;
          return (
            <text key={i} x={x} y={height - 5} textAnchor="middle" fill="#7E8AA8" fontSize="10" className="font-sans font-medium">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

interface DualBarLineChartProps {
  data: { label: string; cashIn: number; cashOut: number; net: number }[];
  height?: number;
}

export const DualBarLineChart: React.FC<DualBarLineChartProps> = ({ data, height = 200 }) => {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => Math.max(d.cashIn, d.cashOut)), 50000);

  return (
    <div className="w-full space-y-3">
      {/* Legend Header */}
      <div className="flex items-center justify-end gap-5 text-[11px] font-semibold text-[#5E6A8A]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#1547F5]" /> Cash In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#EC4899]" /> Cash Out
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] border-2 border-white shadow-xs" /> Net Cash Flow
        </span>
      </div>

      {/* Bar Chart Visualization */}
      <div className="flex items-end justify-between gap-3 pt-4 pb-2 border-b border-[#E7EBF3]" style={{ height: `${height}px` }}>
        {data.map((item, idx) => {
          const inPct = Math.min(100, Math.round((item.cashIn / maxVal) * 100));
          const outPct = Math.min(100, Math.round((item.cashOut / maxVal) * 100));

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
              <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
                {/* Cash In Bar */}
                <div
                  className="w-3 sm:w-4 bg-[#1547F5] rounded-t-sm transition-all group-hover:brightness-110"
                  style={{ height: `${inPct}%` }}
                  title={`Cash In: $${(item.cashIn / 100).toLocaleString()}`}
                />
                {/* Cash Out Bar */}
                <div
                  className="w-3 sm:w-4 bg-[#EC4899]/80 rounded-t-sm transition-all group-hover:brightness-110"
                  style={{ height: `${outPct}%` }}
                  title={`Cash Out: $${(item.cashOut / 100).toLocaleString()}`}
                />
              </div>

              {/* Month Label */}
              <span className="text-[10.5px] font-medium text-[#7E8AA8] mt-2 truncate">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
  layout?: 'auto' | 'stacked' | 'side';
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerLabel = 'Total',
  centerValue,
  layout = 'auto',
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  let cumulativeAngle = 0;
  const radius = 65;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const containerClasses =
    layout === 'side'
      ? 'flex flex-row items-center gap-4 w-full min-w-0'
      : layout === 'stacked'
      ? 'flex flex-col items-center gap-4 w-full min-w-0'
      : 'flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-4 w-full min-w-0';

  return (
    <div className={containerClasses}>
      {/* Donut Graphic */}
      <div className="relative w-[150px] h-[150px] sm:w-[160px] sm:h-[160px] flex-shrink-0 mx-auto">
        <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeAngle * circumference;
            cumulativeAngle += percentage;

            return (
              <circle
                key={index}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all hover:opacity-90 cursor-pointer"
              >
                <title>{`${item.label}: $${(item.value / 100).toLocaleString()} (${((item.value / total) * 100).toFixed(1)}%)`}</title>
              </circle>
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7E8AA8] truncate max-w-[100px]">
            {centerLabel}
          </span>
          <span className="text-[14px] sm:text-[15px] font-extrabold text-[#08123D] leading-tight truncate max-w-[120px]">
            {centerValue || `$${(total / 100).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Donut Legend */}
      <div className="flex-1 w-full min-w-0 space-y-1.5">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div
              key={i}
              className="flex items-center justify-between text-[12px] py-1 border-b border-[#E7EBF3]/50 last:border-none min-w-0 w-full gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span
                  className="text-[#4C5B82] font-medium text-[11px] sm:text-[12px] truncate min-w-0"
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-sans flex-shrink-0 text-right">
                <span className="text-[#08123D] font-bold text-[11px] sm:text-[12px] whitespace-nowrap">
                  ${(item.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-[#7E8AA8] font-semibold w-9 text-right flex-shrink-0">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
