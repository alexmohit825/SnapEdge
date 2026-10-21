import React from 'react';
import type { Matchup } from '../types/football';
import { Zap, Flame, ChevronRight } from 'lucide-react';

interface TopValueSpotlightProps {
  matchups: Matchup[];
  onSelectGame?: (matchupId: string) => void;
}

export const TopValueSpotlight: React.FC<TopValueSpotlightProps> = ({ matchups, onSelectGame }) => {
  // Sort matchups by absolute edge value (divergence)
  const highEdgeGames = [...matchups]
    .filter(m => Math.abs(m.model.divergencePoints) >= 1.5)
    .sort((a, b) => Math.abs(b.model.divergencePoints) - Math.abs(a.model.divergencePoints))
    .slice(0, 3);

  if (highEdgeGames.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {/* Spotlight Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white shadow-xs">
            <Flame className="h-3.5 w-3.5 fill-white" />
          </div>
          <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
            Top Value Opportunities
          </h3>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-700 border border-orange-200">
            {highEdgeGames.length} High-Discrepancy Games
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
          Where our 3,000 drive simulations disagree most with Vegas
        </span>
      </div>

      {/* Graphic Spotlight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {highEdgeGames.map((game) => {
          const edgePts = Math.abs(game.model.divergencePoints).toFixed(1);
          const isHomeCover = game.model.divergencePoints < 0; // Negative divergence favors home covering spread
          const spreadDisplay = isHomeCover 
            ? `${game.homeTeam.name} ${game.market.spread > 0 ? `+${game.market.spread}` : game.market.spread}`
            : `${game.awayTeam.name} ${game.market.spread < 0 ? `+${Math.abs(game.market.spread)}` : -game.market.spread}`;

          return (
            <div
              key={game.id}
              onClick={() => onSelectGame?.(game.id)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-swiss hover:shadow-swiss-hover transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              {/* Dual Team Gradient Accent Top Bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 opacity-90 transition-opacity group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, ${game.awayTeam.logoColor} 0%, ${game.awayTeam.logoColor} 48%, #CBD5E1 50%, ${game.homeTeam.logoColor} 52%, ${game.homeTeam.logoColor} 100%)`
                }}
              />

              <div className="pt-1">
                {/* League & Kickoff Time */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span>{game.league} • WK {game.week}</span>
                  <span className="font-semibold text-slate-600">
                    {game.dateHeader || game.gameSegment || 'Upcoming'}
                  </span>
                </div>

                {/* Matchup Teams Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-xs"
                      style={{ backgroundColor: game.awayTeam.logoColor }}
                    >
                      {game.awayTeam.abbreviation}
                    </div>
                    <div className="leading-tight">
                      <span className="font-bold text-xs text-slate-900 block truncate max-w-[90px]">
                        {game.awayTeam.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {game.awayTeam.record}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-300">@</span>

                  <div className="flex items-center gap-2">
                    <div className="leading-tight text-right">
                      <span className="font-bold text-xs text-slate-900 block truncate max-w-[90px]">
                        {game.homeTeam.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {game.homeTeam.record}
                      </span>
                    </div>
                    <div 
                      className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-xs"
                      style={{ backgroundColor: game.homeTeam.logoColor }}
                    >
                      {game.homeTeam.abbreviation}
                    </div>
                  </div>
                </div>

                {/* Visual Tug-of-War Disparity Gauge */}
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Vegas Market Line:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {game.market.spread < 0 
                        ? `${game.homeTeam.name} by ${Math.abs(game.market.spread)}` 
                        : `${game.awayTeam.name} by ${game.market.spread}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-orange-600 font-medium">SnapEdge Fair Value:</span>
                    <span className="font-mono font-bold text-orange-600">
                      {game.model.fairSpread < 0 
                        ? `${game.homeTeam.name} by ${Math.abs(game.model.fairSpread)}` 
                        : `${game.awayTeam.name} by ${game.model.fairSpread}`}
                    </span>
                  </div>
                </div>

                {/* Best Value Pick Pill */}
                <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                  <span>Pick: {spreadDisplay}</span>
                  <span className="font-mono text-[10px] text-emerald-700">Cover Favor</span>
                </div>
              </div>

              {/* Bottom Recommendation Pill */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-racing-50 text-racing-600 border border-racing-200">
                    <Zap className="h-3 w-3 fill-racing-500 text-racing-600" />
                  </div>
                  <span className="text-xs font-bold text-racing-700">
                    {edgePts} Pt Value Edge
                  </span>
                </div>
                <div className="flex items-center text-[11px] font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                  <span>View Breakdown</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
