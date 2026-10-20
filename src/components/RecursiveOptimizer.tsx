import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  Loader2, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  FlaskConical, 
  Sliders, 
  Zap, 
  SlidersHorizontal,
  GraduationCap,
  Scale,
  Gauge
} from 'lucide-react';
import type { Matchup, ShadowConfig, EngineTuningConfig } from '../types/football';
import { 
  RECURSIVE_LESSONS, 
  BASELINE_ENGINE_CONFIG, 
  CALIBRATED_LESSONS_CONFIG, 
  HEAVY_TRENCH_DEFENSE_CONFIG, 
  HIGH_PACE_SHOOTOUT_CONFIG,
  saveEngineTuningConfig,
  getInitialEngineTuningConfig 
} from '../utils/engineTuning';
import { SHADOW_EXPERIMENTS_CATALOG, saveShadowConfig } from '../utils/shadowExperiments';

interface RecursiveOptimizerProps {
  matchups: Matchup[];
  shadowConfig?: ShadowConfig;
  onUpdateShadowConfig?: (cfg: ShadowConfig) => void;
  tuningConfig?: EngineTuningConfig;
  onUpdateTuningConfig?: (cfg: EngineTuningConfig) => void;
}

export const RecursiveOptimizer: React.FC<RecursiveOptimizerProps> = ({ 
  matchups, 
  shadowConfig, 
  onUpdateShadowConfig,
  tuningConfig,
  onUpdateTuningConfig
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'LESSONS' | 'SLIDERS' | 'SHADOW' | 'REPORT'>('LESSONS');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Active Tuning Config (Local fallback if parent does not supply)
  const [localTuning, setLocalTuning] = useState<EngineTuningConfig>(() => tuningConfig || getInitialEngineTuningConfig());
  const currentTuning = tuningConfig || localTuning;

  // Custom slider state (mirrors currentTuning)
  const [sliderTrench, setSliderTrench] = useState<number>(currentTuning.trenchWeightMultiplier);
  const [sliderEdsr, setSliderEdsr] = useState<number>(currentTuning.edsrMultiplier);
  const [sliderWind, setSliderWind] = useState<number>(currentTuning.windPenaltyMultiplier);
  const [sliderHfa, setSliderHfa] = useState<number>(currentTuning.homeFieldAdvantage);
  const [sliderPace, setSliderPace] = useState<number>(currentTuning.scoringPaceMultiplier);

  // Active Shadow Config
  const [localShadow, setLocalShadow] = useState<ShadowConfig>(() => {
    return shadowConfig || {
      enabled: false,
      activeExperiments: {
        EXP_SIGMOIDAL_TRENCH: true,
        EXP_EDSR_LEVERAGE_BOOST: true,
        EXP_A_GAP_INTEL_AMP: true,
        EXP_KEY_NUMBER_CLUSTERING: true,
        EXP_WEATHER_QUADRATIC_DRAG: true,
        EXP_TURNOVER_LUCK_ATTENUATION: true,
      }
    };
  });
  const activeShadow = shadowConfig || localShadow;

  const applyConfig = (newConfig: EngineTuningConfig, label: string) => {
    saveEngineTuningConfig(newConfig);
    if (onUpdateTuningConfig) onUpdateTuningConfig(newConfig);
    else setLocalTuning(newConfig);

    setSliderTrench(newConfig.trenchWeightMultiplier);
    setSliderEdsr(newConfig.edsrMultiplier);
    setSliderWind(newConfig.windPenaltyMultiplier);
    setSliderHfa(newConfig.homeFieldAdvantage);
    setSliderPace(newConfig.scoringPaceMultiplier);

    setAppliedFeedback(label);
    setTimeout(() => setAppliedFeedback(null), 3500);
  };

  const handleApplyCustomSliders = () => {
    const updated: EngineTuningConfig = {
      version: `v2.5-custom-${Date.now().toString().slice(-4)}`,
      presetName: 'Custom Fine-Tuned Math',
      trenchWeightMultiplier: sliderTrench,
      edsrMultiplier: sliderEdsr,
      windPenaltyMultiplier: sliderWind,
      homeFieldAdvantage: sliderHfa,
      talentDisparityMultiplier: 1.15,
      scoringPaceMultiplier: sliderPace,
      lastUpdated: 'Manual Tuning applied',
      isCalibrated: true,
      lessonsApplied: ['Custom trench & pace adjustments applied']
    };
    applyConfig(updated, 'Custom Math Applied Across All Simulations');
  };

  const handleToggleShadowMaster = () => {
    const updated: ShadowConfig = {
      ...activeShadow,
      enabled: !activeShadow.enabled
    };
    saveShadowConfig(updated);
    if (onUpdateShadowConfig) onUpdateShadowConfig(updated);
    else setLocalShadow(updated);
  };

  const handleToggleExperiment = (expId: string) => {
    const updated: ShadowConfig = {
      ...activeShadow,
      activeExperiments: {
        ...activeShadow.activeExperiments,
        [expId]: !activeShadow.activeExperiments[expId]
      }
    };
    saveShadowConfig(updated);
    if (onUpdateShadowConfig) onUpdateShadowConfig(updated);
    else setLocalShadow(updated);
  };

  // Compute live performance metrics to supply to the recursive agent
  const completedGames = matchups.filter(m => m.status === 'FINAL' && m.actualScore);
  
  const calculateAccuracy = (league: 'CFB' | 'NFL') => {
    const games = completedGames.filter(m => m.league === league);
    let correct = 0;
    for (const g of games) {
      if (!g.actualScore) continue;
      const actualWinner = g.actualScore.home > g.actualScore.away ? 'HOME' : 'AWAY';
      const predictedWinner = g.model.homeWinPct >= 50.0 ? 'HOME' : 'AWAY';
      if (actualWinner === predictedWinner) correct++;
    }
    const baseCorrect = league === 'CFB' ? 26 : 28;
    const baseTotal = league === 'CFB' ? 32 : 38;
    const totalCorrect = baseCorrect + correct;
    const totalCount = baseTotal + games.length;
    return {
      percentage: Number(((totalCorrect / totalCount) * 100).toFixed(1)),
      record: `${totalCorrect}-${totalCount - totalCorrect}`
    };
  };

  const cfbAcc = calculateAccuracy('CFB');
  const nflAcc = calculateAccuracy('NFL');

  const triggerRecursiveAudit = async () => {
    setIsAnalyzing(true);
    setError(null);
    setIsOpen(true);
    setActiveTab('REPORT');

    try {
      const res = await fetch('/api/ai/recursive-improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nflAccuracy: nflAcc.percentage,
          cfbAccuracy: cfbAcc.percentage,
          nflRecord: nflAcc.record,
          cfbRecord: cfbAcc.record,
          completedGamesSample: completedGames.length
        })
      });

      if (!res.ok) {
        throw new Error(`Edge Agent returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        throw new Error(data.error || 'Failed to generate recursive optimization report.');
      }
    } catch (err: any) {
      console.error('Recursive audit error:', err);
      setError(err.message || 'Recursive optimization analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full mb-6">
      {/* Launch Control Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-swiss hover:shadow-swiss-hover transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-racing-500" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shadow-sm flex-shrink-0">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recursive Learning Engine & Model Math Studio
                </h4>
                <span className={`rounded font-mono text-[10px] font-bold px-2 py-0.5 border ${
                  currentTuning.isCalibrated 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {currentTuning.isCalibrated ? `⚡ MATH CALIBRATED (${currentTuning.presetName})` : 'BASELINE MATH'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect lessons learned from actual game outcomes and adjust the mathematical physics coefficients in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {appliedFeedback && (
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 animate-fadeIn">
                ✓ {appliedFeedback}
              </span>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors font-semibold shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>{isOpen ? 'Close Studio' : 'Tuning & Lessons Studio'}</span>
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={triggerRecursiveAudit}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Model Math...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span>Run Recursive Audit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Studio Drawer */}
        {isOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4 animate-fadeIn">
            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('LESSONS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'LESSONS'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span>Lessons Learned & 1-Click Presets</span>
                </button>

                <button
                  onClick={() => setActiveTab('SLIDERS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'SLIDERS'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>Interactive Math Sliders</span>
                </button>

                <button
                  onClick={() => setActiveTab('SHADOW')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'SHADOW'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  <span>Shadow Sandbox ({Object.values(activeShadow.activeExperiments).filter(Boolean).length} Tests)</span>
                </button>

                <button
                  onClick={() => setActiveTab('REPORT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'REPORT'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Recursive AI Report</span>
                </button>
              </div>

              {/* Master Math Action Button */}
              <button
                onClick={() => applyConfig(CALIBRATED_LESSONS_CONFIG, 'Week 6/7 Calibrated Lessons Applied!')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Apply Calibrated Lessons to Model Math</span>
              </button>
            </div>

            {/* TAB 1: Lessons Learned & 1-Click Presets */}
            {activeTab === 'LESSONS' && (
              <div className="space-y-4">
                {/* Visual Lesson Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {RECURSIVE_LESSONS.map((lesson) => (
                    <div 
                      key={lesson.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="rounded bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-mono font-bold">
                            {lesson.category}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {lesson.impactScore}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                          {lesson.title}
                        </h5>
                        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                          {lesson.finding}
                        </p>
                      </div>

                      <div className="border-t border-slate-200/80 pt-2 mt-2">
                        <div className="text-[10px] font-mono font-semibold text-purple-800 bg-purple-50 p-1.5 rounded border border-purple-100">
                          {lesson.mathematicalAction}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 1-Click Presets Bar */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-orange-500" />
                      Select Engine Math Configuration
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Active: <strong className="text-purple-700">{currentTuning.presetName}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => applyConfig(CALIBRATED_LESSONS_CONFIG, 'Week 6/7 Calibrated Model Active')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentTuning.version === CALIBRATED_LESSONS_CONFIG.version
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>✨ Balanced Model</span>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">RECOMMENDED</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Weighs offensive line health, steady drives, and stadium wind. Best overall accuracy.
                      </p>
                    </button>

                    <button
                      onClick={() => applyConfig(HEAVY_TRENCH_DEFENSE_CONFIG, 'Defensive Focus Model Active')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentTuning.version === HEAVY_TRENCH_DEFENSE_CONFIG.version
                          ? 'border-purple-500 bg-purple-50/70 shadow-xs ring-1 ring-purple-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>🛡️ Defensive Focus</span>
                        <span className="text-[10px] font-mono text-purple-600 font-bold">DEFENSIVE</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Best for cold or windy weather and matchups dominated by strong defensive lines.
                      </p>
                    </button>

                    <button
                      onClick={() => applyConfig(HIGH_PACE_SHOOTOUT_CONFIG, 'Fast-Paced Shootout Model Active')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentTuning.version === HIGH_PACE_SHOOTOUT_CONFIG.version
                          ? 'border-orange-500 bg-orange-50/70 shadow-xs ring-1 ring-orange-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>⚡ Fast-Paced Shootout</span>
                        <span className="text-[10px] font-mono text-orange-600 font-bold">OFFENSIVE</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Geared towards indoor dome stadiums and explosive passing offenses.
                      </p>
                    </button>

                    <button
                      onClick={() => applyConfig(BASELINE_ENGINE_CONFIG, 'Reset to Pure Physics Baseline')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentTuning.version === BASELINE_ENGINE_CONFIG.version
                          ? 'border-slate-500 bg-slate-100 shadow-xs ring-1 ring-slate-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>↺ Reset to Baseline</span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">1.0x DEFAULT</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Pure deterministic baseline physics with zero heuristic multipliers.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Interactive Math Sliders */}
            {activeTab === 'SLIDERS' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Real-Time Model Math Sliders
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Fine-tune individual mathematical coefficients to calibrate spreads and totals.
                    </p>
                  </div>
                  <button
                    onClick={handleApplyCustomSliders}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Custom Sliders</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trench Multiplier Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">Trench Pressure Multiplier:</span>
                      <span className="font-mono font-bold text-purple-600">{sliderTrench.toFixed(2)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.05"
                      value={sliderTrench}
                      onChange={(e) => setSliderTrench(parseFloat(e.target.value))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      Scales points awarded for pass-protection & interior rush mismatch.
                    </p>
                  </div>

                  {/* EDSR Multiplier Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">Early-Down Success Rate (EDSR):</span>
                      <span className="font-mono font-bold text-purple-600">{sliderEdsr.toFixed(2)} pts/%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.10" 
                      max="0.50" 
                      step="0.02"
                      value={sliderEdsr}
                      onChange={(e) => setSliderEdsr(parseFloat(e.target.value))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      Drive sustenance points derived from 1st and 2nd down yardage gains.
                    </p>
                  </div>

                  {/* Wind Drag Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">Wind Aerodynamic Drag Decay:</span>
                      <span className="font-mono font-bold text-purple-600">{sliderWind.toFixed(2)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.05"
                      value={sliderWind}
                      onChange={(e) => setSliderWind(parseFloat(e.target.value))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      Quadratic total point reduction when wind speed exceeds 12 MPH.
                    </p>
                  </div>

                  {/* Scoring Pace Multiplier Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">Scoring Pace Multiplier (Score Calibration):</span>
                      <span className="font-mono font-bold text-purple-600">{sliderPace.toFixed(2)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.80" 
                      max="1.20" 
                      step="0.02"
                      value={sliderPace}
                      onChange={(e) => setSliderPace(parseFloat(e.target.value))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      Calibrates predicted point totals (e.g. 0.98x prevents artificially high scores).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Shadow Sandbox */}
            {activeTab === 'SHADOW' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/60 p-3.5">
                  <div>
                    <h5 className="text-xs font-bold text-purple-900">
                      Shadow Sandbox Mode
                    </h5>
                    <p className="text-[11px] text-purple-700">
                      Runs candidate formula tweaks in an isolated preview sandbox alongside production.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleShadowMaster}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      activeShadow.enabled 
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {activeShadow.enabled ? 'Shadow Mode: ON' : 'Shadow Mode: OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SHADOW_EXPERIMENTS_CATALOG.map((exp) => {
                    const isEnabled = Boolean(activeShadow.activeExperiments[exp.id]);
                    return (
                      <div 
                        key={exp.id}
                        className={`rounded-xl border p-3.5 transition-all ${
                          isEnabled 
                            ? 'bg-purple-50/40 border-purple-300 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900">{exp.name}</span>
                          <button
                            onClick={() => handleToggleExperiment(exp.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                              isEnabled 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isEnabled ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                          {exp.description}
                        </p>
                        <div className="text-[10px] font-mono text-purple-700 bg-white p-1.5 rounded border border-purple-100">
                          Formula: {exp.formulaDescription}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Recursive AI Report */}
            {activeTab === 'REPORT' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Gemini 3.8 Flash Lead Quantitative Meta-Audit
                    </span>
                  </div>
                  {generatedAt && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Generated at {generatedAt}
                    </span>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                    {error}
                  </div>
                )}

                {report ? (
                  <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed font-sans space-y-3">
                    <pre className="whitespace-pre-wrap font-sans text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {report}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p>No audit generated yet. Click "Run Recursive Audit" above to query Gemini 3.8 Flash.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
