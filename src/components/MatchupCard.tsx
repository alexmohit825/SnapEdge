import React, { useState } from 'react';
import type { Matchup, SimulationResult, ShadowConfig, EngineTuningConfig } from '../types/football';
import { runMonteCarloSimulation, runComparisonSimulation, verifyDeterminism } from '../utils/simulator';
import { TrenchHeatmap } from './TrenchHeatmap';
import { DistributionChart } from './DistributionChart';
import { 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  Zap, 
  Bot, 
  Loader2,
  FlaskConical,
  ShieldCheck,
  Trophy,
  Flame
} from 'lucide-react';

interface MatchupCardProps {
  matchup: Matchup;
  shadowConfig?: ShadowConfig;
  tuningConfig?: EngineTuningConfig;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup, shadowConfig, tuningConfig }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);

  // Perturbations for "What-If" Studio
  const [forceDome, setForceDome] = useState(false);
  const [windOverride, setWindOverride] = useState<number | undefined>(undefined);
  const [homeQBOut, setHomeQBOut] = useState(false);
  const [homeLTOut, setHomeLTOut] = useState(false);
  const [homeCenterOut, setHomeCenterOut] = useState(false);
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

  const perturbations = {
    forceDome,
    windMphOverride: windOverride,
    homeQBOut,
    homeLTOut,
    homeCenterOut,
    awayDEOut,
  };

  // Compute live Monte Carlo simulation based on user perturbations & active tuning math
  const sim: SimulationResult = runMonteCarloSimulation(matchup, perturbations, { tuningConfig });

  // Compute Shadow Mode Comparison if shadow mode is enabled
  const isShadowActive = Boolean(shadowConfig?.enabled);
  const comparison = runComparisonSimulation(matchup, perturbations, shadowConfig, tuningConfig);

  const [activeCurveMode, setActiveCurveMode] = useState<'PRODUCTION' | 'SHADOW'>('PRODUCTION');
  const activeSim = (activeCurveMode === 'SHADOW' && isShadowActive) ? comparison.shadow : sim;

  // Determinism Verification Check
  const determinism = verifyDeterminism(matchup, perturbations, { tuningConfig });

  const hasPerturbations = forceDome || windOverride !== undefined || homeQBOut || homeLTOut || homeCenterOut || awayDEOut;

  const resetPerturbations = () => {
    setForceDome(false);
    setWindOverride(undefined);
    setHomeQBOut(false);
    setHomeLTOut(false);
    setHomeCenterOut(false);
    setAwayDEOut(false);
  };

  const isDivergenceHigh = Math.abs(matchup.model.divergencePoints) >= 2.0;

  // Trench Clash Metrics
  const homeTrenchAdvantage = matchup.homeTeam.trench.passBlockWinRate - matchup.awayTeam.trench.passRushWinRate;
  const awayTrenchAdvantage = matchup.awayTeam.trench.passBlockWinRate - matchup.homeTeam.trench.passRushWinRate;

  // Actual vs Predicted Score Verification
  const isGameCompleted = matchup.status === 'FINAL' && matchup.actualScore;
  const actualWinner = isGameCompleted 
    ? (matchup.actualScore!.home > matchup.actualScore!.away ? 'HOME' : 'AWAY') 
    : null;
  const predictedWinner = sim.projectedScoreHome > sim.projectedScoreAway ? 'HOME' : 'AWAY';
  const isWinnerCorrect = isGameCompleted && actualWinner === predictedWinner;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-swiss transition-all hover:shadow-swiss-hover hover:border-slate-300 mb-6">
      {/* Top Banner: League, Game Time, & Edge Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800 shadow-xs">
            {matchup.league} • WEEK {matchup.week}
          </span>
          {matchup.status === 'FINAL' ? (
            <span className="rounded-full bg-slate-900 text-emerald-400 font-mono text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-emerald-400" /> FINAL
            </span>
          ) : matchup.status === 'IN_PROGRESS' ? (
            <span className="rounded-full bg-rose-600 text-white font-mono text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wider animate-pulse">
              LIVE
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
              SCHEDULED
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {matchup.stadium} • {matchup.location}
          </span>
        </div>

        {/* Value Edge & Grade */}
        <div className="flex items-center gap-2">
          {isDivergenceHigh && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-0.5 text-xs font-bold text-orange-600 border border-orange-200 shadow-xs">
              <Zap className="h-3.5 w-3.5 fill-orange-500" />
              <span>EDGE: {Math.abs(matchup.model.divergencePoints)} PTS</span>
            </div>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200">
            GRADE {matchup.model.edgeConfidenceGrade}
          </span>
        </div>
      </div>

      {/* Main Visual Arena */}
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          
          {/* Left: Teams & Visual Score Capsules */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Away Team Row */}
            <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div 
                  className="h-11 w-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm flex-shrink-0"
                  style={{ backgroundColor: matchup.awayTeam.logoColor }}
                >
                  {matchup.awayTeam.abbreviation}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    {matchup.awayTeam.rank && (
                      <span className="text-xs font-bold text-orange-600 font-mono">#{matchup.awayTeam.rank}</span>
                    )}
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {matchup.awayTeam.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
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

              {/* Away Visual Scores */}
              <div className="flex items-center gap-3">
                {matchup.actualScore && (
                  <div className="text-center bg-slate-900 text-white px-3 py-1 rounded-xl border border-slate-800 shadow-xs min-w-[54px]">
                    <span className="text-xl font-mono font-black text-emerald-400">
                      {matchup.actualScore.away}
                    </span>
                    <span className="block text-[8px] uppercase font-mono tracking-widest text-slate-300 font-bold">ACTUAL</span>
                  </div>
                )}
                <div className="text-center bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs min-w-[54px]">
                  <span className="text-xl font-mono font-black text-slate-800">
                    {sim.projectedScoreAway}
                  </span>
                  <span className="block text-[8px] uppercase font-mono tracking-widest text-slate-400 font-bold">PRED</span>
                </div>
              </div>
            </div>

            {/* Home Team Row */}
            <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div 
                  className="h-11 w-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm flex-shrink-0"
                  style={{ backgroundColor: matchup.homeTeam.logoColor }}
                >
                  {matchup.homeTeam.abbreviation}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    {matchup.homeTeam.rank && (
                      <span className="text-xs font-bold text-orange-600 font-mono">#{matchup.homeTeam.rank}</span>
                    )}
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {matchup.homeTeam.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
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

              {/* Home Visual Scores */}
              <div className="flex items-center gap-3">
                {matchup.actualScore && (
                  <div className="text-center bg-slate-900 text-white px-3 py-1 rounded-xl border border-slate-800 shadow-xs min-w-[54px]">
                    <span className="text-xl font-mono font-black text-emerald-400">
                      {matchup.actualScore.home}
                    </span>
                    <span className="block text-[8px] uppercase font-mono tracking-widest text-slate-300 font-bold">ACTUAL</span>
                  </div>
                )}
                <div className="text-center bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs min-w-[54px]">
                  <span className="text-xl font-mono font-black text-slate-800">
                    {sim.projectedScoreHome}
                  </span>
                  <span className="block text-[8px] uppercase font-mono tracking-widest text-slate-400 font-bold">PRED</span>
                </div>
              </div>
            </div>

            {/* Kinetic Win Probability Duel Bar */}
            <div className="pt-1">
              <div className="flex justify-between text-xs font-mono font-bold mb-1 px-1">
                <span className="flex items-center gap-1" style={{ color: matchup.awayTeam.logoColor }}>
                  {matchup.awayTeam.abbreviation} {sim.awayWinPct}%
                </span>
                <span className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">
                  Win Probability Duel
                </span>
                <span className="flex items-center gap-1" style={{ color: matchup.homeTeam.logoColor }}>
                  {matchup.homeTeam.abbreviation} {sim.homeWinPct}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                <div 
                  className="transition-all duration-700" 
                  style={{ width: `${sim.awayWinPct}%`, backgroundColor: matchup.awayTeam.logoColor }}
                  title={`${matchup.awayTeam.name}: ${sim.awayWinPct}%`}
                />
                <div 
                  className="transition-all duration-700" 
                  style={{ width: `${sim.homeWinPct}%`, backgroundColor: matchup.homeTeam.logoColor }}
                  title={`${matchup.homeTeam.name}: ${sim.homeWinPct}%`}
                />
              </div>
            </div>

            {/* Completed Game Verification Status Pill */}
            {isGameCompleted && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Actual: {matchup.actualScore!.away} - {matchup.actualScore!.home}</span>
                  <span className="text-slate-400">•</span>
                  <span>Pred: {sim.projectedScoreAway} - {sim.projectedScoreHome}</span>
                </div>
                <span className="font-mono font-bold text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded">
                  {isWinnerCorrect ? '✓ WINNER CORRECT' : 'UPSET OUTCOME'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Modern Market vs Model Telemetry Capsule */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm space-y-3.5">
            <div className="grid grid-cols-2 gap-3 text-center">
              {/* Public Sportsbook Market */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="block text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-1 font-bold">
                  Sportsbook Line
                </span>
                <div className="text-2xl font-mono font-black text-slate-900">
                  {matchup.market.spread > 0 ? `+${matchup.market.spread}` : matchup.market.spread}
                </div>
                <div className="text-xs text-slate-600 font-semibold mt-0.5">
                  O/U {matchup.market.total}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">
                  {matchup.market.publicCashPctHome}% Public Cash
                </div>
              </div>

              {/* SnapEdge Model Fair Line */}
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-200 shadow-xs">
                <span className="block text-[10px] font-mono uppercase text-orange-600 tracking-wider mb-1 font-bold">
                  SnapEdge Value
                </span>
                <div className="text-2xl font-mono font-black text-orange-600">
                  {sim.simulatedSpread > 0 ? `+${sim.simulatedSpread}` : sim.simulatedSpread}
                </div>
                <div className="text-xs text-orange-800 font-semibold mt-0.5">
                  Fair O/U {sim.simulatedTotal}
                </div>
                <div className="mt-1 text-[10px] text-racing-600 font-mono font-bold">
                  {sim.homeWinPct}% Model Prob
                </div>
              </div>
            </div>

            {/* Trench Pocket Advantage Mini Gauge */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1 font-bold">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Trench Pressure Clash:
                </span>
                <span className={`font-mono font-bold text-[11px] ${
                  homeTrenchAdvantage >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {matchup.homeTeam.abbreviation} {homeTrenchAdvantage >= 0 ? `+${homeTrenchAdvantage}%` : `${homeTrenchAdvantage}%`} Pocket Edge
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{matchup.homeTeam.abbreviation} PBWR: {matchup.homeTeam.trench.passBlockWinRate}%</span>
                <span>•</span>
                <span>{matchup.awayTeam.abbreviation} Net: {awayTrenchAdvantage >= 0 ? `+${awayTrenchAdvantage}%` : `${awayTrenchAdvantage}%`}</span>
              </div>
            </div>

            {/* Shadow Comparison Strip if active */}
            {isShadowActive && comparison.activeExperimentsCount > 0 && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <span>Shadow Preview:</span>
                  <span className="font-mono text-purple-700">
                    {comparison.shadow.simulatedSpread > 0 ? `+${comparison.shadow.simulatedSpread}` : comparison.shadow.simulatedSpread} ({comparison.shadow.homeWinPct}%)
                  </span>
                </div>
                <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-purple-200/80 text-purple-900">
                  Δ {comparison.spreadDelta > 0 ? `+${comparison.spreadDelta}` : comparison.spreadDelta} pts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Edge Chips (Replaces paragraph walls of text) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {matchup.receipts.map((receipt) => (
              <span 
                key={receipt.id}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
                title={receipt.description}
              >
                <Zap className="h-3 w-3 text-orange-500" />
                <span>{receipt.category}:</span>
                <strong className={receipt.direction === 'HOME_FAVORED' ? 'text-racing-600' : 'text-blue-600'}>
                  {receipt.impactPoints > 0 ? `+${receipt.impactPoints}` : receipt.impactPoints} PTS
                </strong>
                <span className="text-slate-400 font-normal">
                  ({receipt.direction === 'HOME_FAVORED' ? matchup.homeTeam.abbreviation : matchup.awayTeam.abbreviation})
                </span>
              </span>
            ))}
          </div>

          {/* Action Hub Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-xs"
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
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                hasPerturbations || showWhatIf 
                  ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-purple-600" />
              <span>{hasPerturbations ? 'Simulation Active' : 'What-If Studio'}</span>
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <span>{showDetails ? 'Hide Diagnostics' : 'Deep Trench & Receipts'}</span>
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

        {/* What-If Counterfactual Sandbox */}
        {showWhatIf && (
          <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/40 p-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between mb-3 border-b border-purple-200 pb-2 gap-2">
              <div className="flex items-center gap-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Client-Side Counterfactual Simulator (10,000 Runs)</span>
                {determinism.isDeterministic && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    DETERMINISTIC [100% REPRODUCIBLE]
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isShadowActive && comparison.activeExperimentsCount > 0 && (
                  <div className="inline-flex rounded-lg border border-purple-300 bg-white p-0.5 text-[10px] font-bold">
                    <button
                      onClick={() => setActiveCurveMode('PRODUCTION')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        activeCurveMode === 'PRODUCTION'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      Production
                    </button>
                    <button
                      onClick={() => setActiveCurveMode('SHADOW')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        activeCurveMode === 'SHADOW'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      Shadow
                    </button>
                  </div>
                )}
                {hasPerturbations && (
                  <button
                    onClick={resetPerturbations}
                    className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 px-2 py-1 rounded bg-purple-100"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Monte Carlo Distribution Curve */}
            <DistributionChart
              distribution={activeSim.distributionScores}
              marketSpread={matchup.market.spread}
              simulatedSpread={activeSim.simulatedSpread}
              homeWinPct={activeSim.homeWinPct}
              homeName={matchup.homeTeam.name}
              awayName={matchup.awayTeam.name}
              isDeterministic={determinism.isDeterministic}
            />

            {/* Quick Perturbation Toggles */}
            <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setHomeCenterOut(!homeCenterOut)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  homeCenterOut 
                    ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {matchup.homeTeam.abbreviation} Center Out (A-Gap Collapse)
              </button>

              <button
                onClick={() => setHomeQBOut(!homeQBOut)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  homeQBOut 
                    ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {matchup.homeTeam.abbreviation} Starting QB Inactive
              </button>

              <button
                onClick={() => setForceDome(!forceDome)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  forceDome 
                    ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                Dome Environment (0 MPH Wind)
              </button>

              <button
                onClick={() => setWindOverride(windOverride === 22 ? undefined : 22)}
                className={`rounded-lg px-3 py-1.5 border transition-all ${
                  windOverride === 22 
                    ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                22 MPH Wind Gusts (Passing Decay)
              </button>
            </div>
          </div>
        )}

        {/* Deep Trench Heatmap & Receipts Ledger */}
        {showDetails && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 animate-fadeIn">
            <TrenchHeatmap
              homeName={matchup.homeTeam.name}
              awayName={matchup.awayTeam.name}
              homeTrench={matchup.homeTeam.trench}
              awayTrench={matchup.awayTeam.trench}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                <CheckCircle2 className="h-4 w-4 text-racing-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Itemized Mathematical Receipts
                </span>
              </div>

              <div className="space-y-2">
                {matchup.receipts.map((receipt) => (
                  <div 
                    key={receipt.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs"
                  >
                    <div>
                      <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 mb-1">
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
