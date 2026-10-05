import React, { useState } from 'react';
import type { Matchup, SimulationResult } from '../types/football';
import { runMonteCarloSimulation } from '../utils/simulator';
import { TrenchHeatmap } from './TrenchHeatmap';
import { DistributionChart } from './DistributionChart';
import { 
  ChevronDown, 
  ChevronUp, 
  Wind, 
  CloudRain, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  Zap,
  Bot,
  Loader2
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

  // Live Gemini AI Scout State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchAiAnalysis = async () => {
    if (aiAnalysis) {
      setShowAiModal(!showAiModal);
      return;
    }

    setIsAnalyzing(true);
    setShowAiModal(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchupTitle: `${matchup.awayTeam.name} at ${matchup.homeTeam.name}`,
          prompt: `Act as an elite NFL/CFB trench analyst for ${matchup.awayTeam.name} vs ${matchup.homeTeam.name}. In 2 sharp sentences, explain the decisive trench mismatch between the pass protection (PBWR: ${matchup.homeTeam.trench.passBlockWinRate}% vs ${matchup.awayTeam.trench.passRushWinRate}%) and why the market spread (${matchup.market.spread}) is vulnerable to our SnapEdge fair spread (${matchup.model.fairSpread}).`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis || 'Analysis ready.');
      } else {
        setAiAnalysis('Gemini AI Scout is analyzing heavy game traffic. Please tap again in 5 seconds.');
      }
    } catch {
      setAiAnalysis('Connection to Cloudflare AI Gateway was interrupted. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-swiss transition-all hover:shadow-swiss-hover hover:border-slate-300 mb-6">
      {/* Top Banner: League, Time, & Divergence Alert */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800 shadow-sm">
            {matchup.league} • WEEK {matchup.week}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {matchup.stadium} ({matchup.location})
          </span>
        </div>

        {/* Divergence Edge Pill */}
        <div className="flex items-center gap-2">
          {isDivergenceHigh && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 border border-orange-200 shadow-sm">
              <Zap className="h-3.5 w-3.5 fill-orange-500" />
              <span>EDGE: {Math.abs(matchup.model.divergencePoints)} PTS VALUE</span>
            </div>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
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
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-sm"
                  style={{ backgroundColor: matchup.awayTeam.logoColor }}
                >
                  {matchup.awayTeam.abbreviation}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {matchup.awayTeam.rank && (
                      <span className="text-xs font-bold text-orange-600 font-mono">#{matchup.awayTeam.rank}</span>
                    )}
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {matchup.awayTeam.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{matchup.awayTeam.record}</span>
                    <span>•</span>
                    <span>{matchup.awayTeam.conference}</span>
                    {matchup.awayTeam.blueChipRatio && (
                      <span className="text-slate-700 font-mono font-semibold">
                        ({matchup.awayTeam.blueChipRatio}% Blue-Chip)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Away Proj Score */}
              <div className="text-right">
                <span className="text-2xl font-mono font-black text-slate-900">
                  {sim.projectedScoreAway}
                </span>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Proj</span>
              </div>
            </div>

            {/* Home Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-sm"
                  style={{ backgroundColor: matchup.homeTeam.logoColor }}
                >
                  {matchup.homeTeam.abbreviation}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {matchup.homeTeam.rank && (
                      <span className="text-xs font-bold text-orange-600 font-mono">#{matchup.homeTeam.rank}</span>
                    )}
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {matchup.homeTeam.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{matchup.homeTeam.record}</span>
                    <span>•</span>
                    <span>{matchup.homeTeam.conference}</span>
                    {matchup.homeTeam.blueChipRatio && (
                      <span className="text-slate-700 font-mono font-semibold">
                        ({matchup.homeTeam.blueChipRatio}% Blue-Chip)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Home Proj Score */}
              <div className="text-right">
                <span className="text-2xl font-mono font-black text-slate-900">
                  {sim.projectedScoreHome}
                </span>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Proj</span>
              </div>
            </div>
          </div>

          {/* Market vs SnapEdge Projection Side-by-Side */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            {/* Public Market */}
            <div>
              <span className="block text-[11px] font-mono uppercase text-slate-500 tracking-wider mb-1 font-semibold">
                Market Line
              </span>
              <div className="text-xl font-mono font-black text-slate-800">
                {matchup.market.spread > 0 ? `+${matchup.market.spread}` : matchup.market.spread}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                O/U {matchup.market.total}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                {matchup.market.publicCashPctHome}% Public Cash
              </div>
            </div>

            {/* SnapEdge Model Fair Value */}
            <div className="border-l border-slate-200 pl-3">
              <span className="block text-[11px] font-mono uppercase text-orange-600 tracking-wider mb-1 font-bold">
                SnapEdge Value
              </span>
              <div className="text-xl font-mono font-black text-orange-600">
                {sim.simulatedSpread > 0 ? `+${sim.simulatedSpread}` : sim.simulatedSpread}
              </div>
              <div className="text-xs text-slate-700 font-medium">
                O/U {sim.simulatedTotal}
              </div>
              <div className="mt-1 text-[10px] text-racing-600 font-mono font-bold">
                {sim.homeWinPct}% Win Prob
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Indicators Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2 text-xs text-slate-600 border border-slate-200">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <Wind className="h-3.5 w-3.5 text-blue-600" />
              <span>{matchup.weather.windMph} MPH Wind</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CloudRain className="h-3.5 w-3.5 text-slate-500" />
              <span>{matchup.weather.tempF}°F ({matchup.weather.description})</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Ask AI Scout Button */}
            <button
              onClick={fetchAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
            >
              {isAnalyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              <span>{isAnalyzing ? 'Scouting...' : 'Ask AI Scout'}</span>
            </button>

            <button
              onClick={() => setShowWhatIf(!showWhatIf)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                hasPerturbations || showWhatIf 
                  ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{hasPerturbations ? 'Simulation Active' : 'What-If Studio'}</span>
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>{showDetails ? 'Hide Receipts' : 'View Receipts'}</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Live Gemini AI Scout Briefing Box */}
        {showAiModal && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Gemini 3.8 Flash Tactical Scouting Intelligence
                </span>
              </div>
              <span className="text-[10px] font-mono text-orange-600 bg-orange-100 px-2 py-0.5 rounded font-bold border border-orange-200">
                LIVE EDGE AI
              </span>
            </div>

            {isAnalyzing ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Interrogating Trench & Pass-Rush Matrices with Gemini 3.8...</span>
              </div>
            ) : (
              <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
                {aiAnalysis}
              </p>
            )}
          </div>
        )}

        {/* What-If Counterfactual Sandbox (Perturbations) */}
        {showWhatIf && (
          <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/40 p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Client-Side Counterfactual Simulator (10,000 Runs)</span>
              </div>
              {hasPerturbations && (
                <button
                  onClick={resetPerturbations}
                  className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            {/* Dynamic Monte Carlo Distribution Curve */}
            <DistributionChart
              distribution={sim.distributionScores}
              marketSpread={matchup.market.spread}
              simulatedSpread={sim.simulatedSpread}
              homeWinPct={sim.homeWinPct}
              homeName={matchup.homeTeam.name}
              awayName={matchup.awayTeam.name}
            />

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setHomeQBOut(!homeQBOut)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  homeQBOut 
                    ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                Simulate {matchup.homeTeam.name} QB Out
              </button>

              <button
                onClick={() => setHomeLTOut(!homeLTOut)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  homeLTOut 
                    ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                Simulate {matchup.homeTeam.name} LT Out (Blindside Collapse)
              </button>

              <button
                onClick={() => setAwayDEOut(!awayDEOut)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  awayDEOut 
                    ? 'bg-emerald-100 border-emerald-400 text-racing-600 font-bold shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                Simulate {matchup.awayTeam.name} Top Edge Rusher Out
              </button>

              <button
                onClick={() => setForceDome(!forceDome)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  forceDome 
                    ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                Play in Dome (0 MPH Wind)
              </button>

              <button
                onClick={() => setWindOverride(windOverride === 22 ? undefined : 22)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  windOverride === 22 
                    ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                Test 22 MPH Gusts (Passing Decay)
              </button>
            </div>
          </div>
        )}

        {/* Expandable Details: Trench Heatmap & Receipts Ledger */}
        {showDetails && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 animate-fadeIn">
            {/* 1. Trench Heatmap */}
            <TrenchHeatmap
              homeName={matchup.homeTeam.name}
              awayName={matchup.awayTeam.name}
              homeTrench={matchup.homeTeam.trench}
              awayTrench={matchup.awayTeam.trench}
            />

            {/* 2. Explainable AI Receipts Ledger */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                <CheckCircle2 className="h-4 w-4 text-racing-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  The Edge Receipts (Itemized Model Factors)
                </span>
              </div>

              <div className="space-y-2.5">
                {matchup.receipts.map((receipt) => (
                  <div 
                    key={receipt.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                        {receipt.category}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {receipt.description}
                      </p>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className={`font-mono text-xs font-bold ${
                        receipt.direction === 'HOME_FAVORED' ? 'text-racing-600' : 'text-blue-600'
                      }`}>
                        {receipt.impactPoints > 0 ? `+${receipt.impactPoints}` : receipt.impactPoints} PTS
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono">
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
