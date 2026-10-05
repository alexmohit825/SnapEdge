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
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Line of Scrimmage Physics (Trench Heatmap)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Threshold: 2.50s Pocket Lifespan
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home O-Line vs Away Pass Rush */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-white">{homeName} Pass Protection</span>
            <span className="font-mono text-slate-300">vs {awayName} Pass Rush</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Pass Block Win Rate (PBWR)</span>
                <span className="font-mono font-bold text-emerald-400">{homeTrench.passBlockWinRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full" 
                  style={{ width: `${homeTrench.passBlockWinRate}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Opponent Pass Rush Win Rate</span>
                <span className="font-mono font-bold text-rose-400">{awayTrench.passRushWinRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 rounded-full" 
                  style={{ width: `${awayTrench.passRushWinRate}%` }} 
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800">
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" /> Clean Pocket Time:
              </span>
              <span className={`font-mono font-bold ${homeTrench.avgTimeToThrowSec >= 2.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {homeTrench.avgTimeToThrowSec}s
              </span>
            </div>
          </div>
        </div>

        {/* Away O-Line vs Home Pass Rush */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-white">{awayName} Pass Protection</span>
            <span className="font-mono text-slate-300">vs {homeName} Pass Rush</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Pass Block Win Rate (PBWR)</span>
                <span className="font-mono font-bold text-emerald-400">{awayTrench.passBlockWinRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full" 
                  style={{ width: `${awayTrench.passBlockWinRate}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Opponent Pass Rush Win Rate</span>
                <span className="font-mono font-bold text-rose-400">{homeTrench.passRushWinRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 rounded-full" 
                  style={{ width: `${homeTrench.passRushWinRate}%` }} 
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800">
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" /> Clean Pocket Time:
              </span>
              <span className={`font-mono font-bold ${awayTrench.avgTimeToThrowSec >= 2.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {awayTrench.avgTimeToThrowSec}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
