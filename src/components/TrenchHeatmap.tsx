import React from 'react';
import type { TrenchUnit } from '../types/football';
import { Shield, Clock } from 'lucide-react';

interface TrenchHeatmapProps {
  homeName: string;
  awayName: string;
  homeTrench: TrenchUnit;
  awayTrench: TrenchUnit;
}

export const TrenchHeatmap: React.FC<TrenchHeatmapProps> = ({
  homeName,
  awayName,
  homeTrench,
  awayTrench,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-racing-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Line of Scrimmage Physics (Trench Heatmap)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Threshold: 2.50s Pocket Lifespan
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home O-Line vs Away Pass Rush */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-slate-900">{homeName} Pass Protection</span>
            <span className="font-mono text-slate-500">vs {awayName} Rush</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 font-medium">Pass Block Win Rate (PBWR)</span>
                <span className="font-mono font-bold text-racing-600">{homeTrench.passBlockWinRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-racing-500 rounded-full" 
                  style={{ width: `${homeTrench.passBlockWinRate}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 font-medium">Opponent Pass Rush Win Rate</span>
                <span className="font-mono font-bold text-rose-600">{awayTrench.passRushWinRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full" 
                  style={{ width: `${awayTrench.passRushWinRate}%` }} 
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Clean Pocket Time:
              </span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                homeTrench.avgTimeToThrowSec >= 2.7 
                  ? 'bg-emerald-50 text-racing-600 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {homeTrench.avgTimeToThrowSec}s
              </span>
            </div>
          </div>
        </div>

        {/* Away O-Line vs Home Pass Rush */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-slate-900">{awayName} Pass Protection</span>
            <span className="font-mono text-slate-500">vs {homeName} Rush</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 font-medium">Pass Block Win Rate (PBWR)</span>
                <span className="font-mono font-bold text-racing-600">{awayTrench.passBlockWinRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-racing-500 rounded-full" 
                  style={{ width: `${awayTrench.passBlockWinRate}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 font-medium">Opponent Pass Rush Win Rate</span>
                <span className="font-mono font-bold text-rose-600">{homeTrench.passRushWinRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full" 
                  style={{ width: `${homeTrench.passRushWinRate}%` }} 
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Clean Pocket Time:
              </span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                awayTrench.avgTimeToThrowSec >= 2.7 
                  ? 'bg-emerald-50 text-racing-600 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {awayTrench.avgTimeToThrowSec}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
