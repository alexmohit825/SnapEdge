import React from 'react';

interface DistributionChartProps {
  distribution: { margin: number; count: number }[];
  marketSpread: number;
  simulatedSpread: number;
  homeWinPct: number;
  homeName: string;
  awayName: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  distribution,
  marketSpread,
  simulatedSpread,
  homeWinPct,
  homeName,
  awayName,
}) => {
  const [zoomLevel, setZoomLevel] = React.useState<number>(1); // 1x, 1.5x, 2.5x
  if (!distribution || distribution.length === 0) return null;

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  
  // Dynamic bounds depending on zoom level:
  // 1x = -28 to +28 (full view)
  // 1.5x = -18 to +18 (standard betting key-number window)
  // 2.5x = -10 to +10 (high-leverage margin tail / field-goal window)
  const rangeMargin = zoomLevel === 2.5 ? 10 : zoomLevel === 1.5 ? 18 : 28;
  const minMargin = -rangeMargin;
  const maxMargin = rangeMargin;

  // Filter and normalize points within the active zoom window
  const filtered = distribution.filter((d) => d.margin >= minMargin && d.margin <= maxMargin);

  // SVG dimensions
  const width = 600;
  const height = 145;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Convert margin & count to SVG coordinates
  const getX = (margin: number) => {
    const ratio = (margin - minMargin) / (maxMargin - minMargin);
    return paddingX + ratio * chartWidth;
  };

  const getY = (count: number) => {
    const ratio = count / maxCount;
    return height - paddingY - ratio * chartHeight;
  };

  // Generate SVG smooth path line & area
  const points = filtered.map((d) => `${getX(d.margin)},${getY(d.count)}`);
  const linePath = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaPath = filtered.length > 0
    ? `M ${getX(filtered[0]?.margin || minMargin)},${height - paddingY} L ${points.join(' L ')} L ${getX(filtered[filtered.length - 1]?.margin || maxMargin)},${height - paddingY} Z`
    : '';

  const marketSpreadX = getX(-marketSpread);
  const modelSpreadX = getX(-simulatedSpread);

  // Ticks based on zoom level
  const ticks = zoomLevel === 2.5
    ? [-10, -7, -3, 0, 3, 7, 10]
    : zoomLevel === 1.5
    ? [-17, -14, -10, -7, -3, 0, 3, 7, 10, 14, 17]
    : [-28, -21, -14, -7, 0, 7, 14, 21, 28];

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 my-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Probability Distribution Curve (10,000 Runs)
          </span>
          {/* Interactive Zoom Controls */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setZoomLevel(1)}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                zoomLevel === 1 ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Full Window (-28 to +28)"
            >
              1x Full
            </button>
            <button
              onClick={() => setZoomLevel(1.5)}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                zoomLevel === 1.5 ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Key Numbers Window (-18 to +18)"
            >
              1.5x Key
            </button>
            <button
              onClick={() => setZoomLevel(2.5)}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                zoomLevel === 2.5 ? 'bg-white text-orange-600 shadow-xs border border-orange-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Close Game Margin (-10 to +10)"
            >
              2.5x Zoom
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-racing-600 font-bold">
            {homeName} Win: {homeWinPct}%
          </span>
          <span className="text-blue-600 font-bold">
            {awayName} Win: {(100 - homeWinPct).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Swiss Clean Gradient Fill */}
            <linearGradient id="swissCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#059669" stop-opacity="0.25" />
              <stop offset="80%" stop-color="#3B82F6" stop-opacity="0.08" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
            </linearGradient>

            <linearGradient id="swissStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#2563EB" />
              <stop offset="50%" stop-color="#059669" />
              <stop offset="100%" stop-color="#FF4800" />
            </linearGradient>
          </defs>

          {/* Zero Line (Tie / OT divider) */}
          <line
            x1={getX(0)}
            y1={paddingY - 5}
            x2={getX(0)}
            y2={height - paddingY}
            stroke="#CBD5E1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text 
            x={getX(0)} 
            y={paddingY - 8} 
            fill="#94A3B8" 
            fontSize="9" 
            textAnchor="middle"
            fontFamily="monospace"
          >
            TIE (0)
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill="url(#swissCurveGradient)" />

          {/* Stroke Curve */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#swissStrokeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Market Spread Vertical Reference Line */}
          {marketSpreadX >= paddingX && marketSpreadX <= width - paddingX && (
            <g>
              <line
                x1={marketSpreadX}
                y1={paddingY}
                x2={marketSpreadX}
                y2={height - paddingY}
                stroke="#64748B"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle cx={marketSpreadX} cy={paddingY + 15} r="3" fill="#64748B" />
              <text
                x={marketSpreadX}
                y={paddingY + 30}
                fill="#475569"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                MKT {marketSpread > 0 ? `+${marketSpread}` : marketSpread}
              </text>
            </g>
          )}

          {/* Model Simulated Mean Line */}
          {modelSpreadX >= paddingX && modelSpreadX <= width - paddingX && (
            <g>
              <line
                x1={modelSpreadX}
                y1={paddingY - 5}
                x2={modelSpreadX}
                y2={height - paddingY}
                stroke="#FF4800"
                strokeWidth="2"
              />
              <circle cx={modelSpreadX} cy={paddingY} r="4" fill="#FF4800" />
              <text
                x={modelSpreadX}
                y={paddingY + 12}
                fill="#FF4800"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                SIM {simulatedSpread > 0 ? `+${simulatedSpread}` : simulatedSpread}
              </text>
            </g>
          )}

          {/* Baseline X-axis */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Margin Ticks */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={getX(tick)}
                y1={height - paddingY}
                x2={getX(tick)}
                y2={height - paddingY + 4}
                stroke="#CBD5E1"
                strokeWidth="1"
              />
              <text
                x={getX(tick)}
                y={height - paddingY + 14}
                fill="#94A3B8"
                fontSize="8"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono">
        <span>← {awayName} Blowout Margin</span>
        <span className="text-slate-700 font-semibold">Margin of Victory (Points)</span>
        <span>{homeName} Blowout Margin →</span>
      </div>
    </div>
  );
};
