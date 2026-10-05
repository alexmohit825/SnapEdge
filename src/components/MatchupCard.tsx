import React, { useState } from 'react';
import type { Matchup, SimulationResult } from '../types/football';
import { runMonteCarloSimulation } from '../utils/simulator';
import { TrenchHeatmap } from './TrenchHeatmap';
import { 
  ChevronDown, 
  ChevronUp, 
  Wind, 
  CloudRain, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  Zap
} from 'lucide-react';

interface MatchupCardProps {
  matchup: Matchup;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);

  // Perturbations for "What-If" Studio
  const [forceDome, setForceDome] = useState(false);
  const [windOverride, setWindOverride] = useState<number | undefined>(undefined);
  const [homeQBOut, setHomeQBOut] = useState(false);
  const [homeLTOut, setHomeLTOut] = useState(false);
  const [awayDEOut, setAwayDEOut] = useState(false);

  // Compute live Monte Carlo simulation based on user perturbations
  const sim: SimulationResult = runMonteCarloSimulation(matchup, {
    forceDome,
    windMphOverride: windOverride,
    homeQBOut,
    homeLTOut,
    awayDEOut,
  });

  const hasPerturbations = forceDome || windOverride !== undefined || homeQBOut || homeLTOut || awayDEOut;

  const resetPerturbations = () => {
    setForceDome(false);
    setWindOverride(undefined);
    setHomeQBOut(false);
    setHomeLTOut(false);
    setAwayDEOut(false);
  };

  const isDivergenceHigh = Math.abs(matchup.model.divergencePoints) >= 2.0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-md transition-all hover:border-slate-700/80 mb-6">
      {/* Top Banner: League, Time, & Divergence Alert */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/60 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-300">
            {matchup.league} • WEEK {matchup.week}
          </span>
          <span className="text-xs text-slate-400">
            {matchup.stadium} ({matchup.location})
          </span>
        </div>

        {/* Divergence Edge Pill */}
        <div className="flex items-center gap-2">
          {isDivergenceHigh && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-400/30">
              <Zap className="h-3.5 w-3.5 fill-emerald-400" />
              <span>EDGE: {Math.abs(matchup.model.divergencePoints)} PTS VALUE</span>
            </div>
          )}
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-300">
            GRADE {matchup.model.edgeConfidenceGrade}
          </span>
        </div>
      </div>

      {/* Main Scoreboard & Market Comparison */}
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Teams Header */}
          <div className="lg:col-span-7 space-y-4">
            {/* Away Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md"
                  style={{ backgroundColor: matchup.awayTeam.logoColor }}
                >
                  {matchup.awayTeam.abbreviation}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {matchup.awayTeam.rank && (
                      <span className="text-xs font-bold text-slate-400">#{matchup.awayTeam.rank}</span>
                    )}
                    <h4 className="text-base font-bold text-white tracking-wide">
                      {matchup.awayTeam.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{matchup.awayTeam.record}</span>
                    <span>•</span>
                    <span>{matchup.awayTeam.conference}</span>
                    {matchup.awayTeam.blueChipRatio && (
                      <span className="text-cyan-400 font-mono">
                        ({matchup.awayTeam.blueChipRatio}% Blue-Chip)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Away Proj Score */}
              <div className="text-right">
                <span className="text-2xl font-mono font-black text-white">
                  {sim.projectedScoreAway}
                </span>
                <span className="block text-[10px] uppercase font-mono text-slate-500">Proj</span>
              </div>
            </div>

            {/* Home Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md"
                  style={{ backgroundColor: matchup.homeTeam.logoColor }}
                >
                  {matchup.homeTeam.abbreviation}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {matchup.homeTeam.rank && (
                      <span className="text-xs font-bold text-slate-400">#{matchup.homeTeam.rank}</span>
                    )}
                    <h4 className="text-base font-bold text-white tracking-wide">
                      {matchup.homeTeam.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{matchup.homeTeam.record}</span>
                    <span>•</span>
                    <span>{matchup.homeTeam.conference}</span>
                    {matchup.homeTeam.blueChipRatio && (
                      <span className="text-cyan-400 font-mono">
                        ({matchup.homeTeam.blueChipRatio}% Blue-Chip)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Home Proj Score */}
              <div className="text-right">
                <span className="text-2xl font-mono font-black text-white">
                  {sim.projectedScoreHome}
                </span>
                <span className="block text-[10px] uppercase font-mono text-slate-500">Proj</span>
              </div>
            </div>
          </div>

          {/* Market vs SnapEdge Projection Side-by-Side */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            {/* Public Market */}
            <div>
              <span className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">
                Market Line
              </span>
              <div className="text-lg font-mono font-bold text-slate-300">
                {matchup.market.spread > 0 ? `+${matchup.market.spread}` : matchup.market.spread}
              </div>
              <div className="text-xs text-slate-400">
                O/U {matchup.market.total}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                {matchup.market.publicCashPctHome}% Public Cash
              </div>
            </div>

            {/* SnapEdge Model Fair Value */}
            <div className="border-l border-slate-800 pl-3">
              <span className="block text-[11px] font-mono uppercase text-emerald-400 tracking-wider mb-1">
                SnapEdge Value
              </span>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {sim.simulatedSpread > 0 ? `+${sim.simulatedSpread}` : sim.simulatedSpread}
              </div>
              <div className="text-xs text-emerald-300">
                O/U {sim.simulatedTotal}
              </div>
              <div className="mt-1 text-[10px] text-emerald-400/80 font-mono">
                {sim.homeWinPct}% Win Prob
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Indicators Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950/40 px-3.5 py-2 text-xs text-slate-400 border border-slate-800/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-cyan-400" />
              <span>{matchup.weather.windMph} MPH Wind</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CloudRain className="h-3.5 w-3.5 text-slate-400" />
              <span>{matchup.weather.tempF}°F ({matchup.weather.description})</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWhatIf(!showWhatIf)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                hasPerturbations || showWhatIf 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{hasPerturbations ? 'Simulation Active' : 'What-If Studio'}</span>
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <span>{showDetails ? 'Hide Receipts' : 'View Receipts'}</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* What-If Counterfactual Sandbox (Perturbations) */}
        {showWhatIf && (
          <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-950/10 p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 border-b border-purple-500/20 pb-2">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Client-Side Counterfactual Simulator (10,000 Runs)</span>
              </div>
              {hasPerturbations && (
                <button
                  onClick={resetPerturbations}
                  className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setHomeQBOut(!homeQBOut)}
                className={`rounded-lg px-3 py-1.5 border transition-colors ${
                  homeQBOut 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Simulate {matchup.homeTeam.name} QB Out
              </button>

              <button
                onClick={() => setHomeLTOut(!homeLTOut)}
                className={`rounded-lg px-3 py-1.5 border transition-colors ${
                  homeLTOut 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Simulate {matchup.homeTeam.name} LT Out (Blindside Collapse)
              </button>

              <button
                onClick={() => setAwayDEOut(!awayDEOut)}
                className={`rounded-lg px-3 py-1.5 border transition-colors ${
                  awayDEOut 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Simulate {matchup.awayTeam.name} Top Edge Rusher Out
              </button>

              <button
                onClick={() => setForceDome(!forceDome)}
                className={`rounded-lg px-3 py-1.5 border transition-colors ${
                  forceDome 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Play in Dome (0 MPH Wind)
              </button>

              <button
                onClick={() => setWindOverride(windOverride === 22 ? undefined : 22)}
                className={`rounded-lg px-3 py-1.5 border transition-colors ${
                  windOverride === 22 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Test 22 MPH Gusts (Passing Decay)
              </button>
            </div>
          </div>
        )}

        {/* Expandable Details: Trench Heatmap & Receipts Ledger */}
        {showDetails && (
          <div className="mt-4 space-y-4 border-t border-slate-800 pt-4 animate-fadeIn">
            {/* 1. Trench Heatmap */}
            <TrenchHeatmap
              homeName={matchup.homeTeam.name}
              awayName={matchup.awayTeam.name}
              homeTrench={matchup.homeTeam.trench}
              awayTrench={matchup.awayTeam.trench}
            />

            {/* 2. Explainable AI Receipts Ledger */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  The Edge Receipts (Itemized Model Factors)
                </span>
              </div>

              <div className="space-y-2.5">
                {matchup.receipts.map((receipt) => (
                  <div 
                    key={receipt.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-2.5"
                  >
                    <div className="space-y-0.5">
                      <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                        {receipt.category}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {receipt.description}
                      </p>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className={`font-mono text-xs font-bold ${
                        receipt.direction === 'HOME_FAVORED' ? 'text-emerald-400' : 'text-cyan-400'
                      }`}>
                        {receipt.impactPoints > 0 ? `+${receipt.impactPoints}` : receipt.impactPoints} PTS
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono">
                        {receipt.direction === 'HOME_FAVORED' ? matchup.homeTeam.abbreviation : matchup.awayTeam.abbreviation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
