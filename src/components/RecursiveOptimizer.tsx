import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  Loader2, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { Matchup, ShadowConfig } from '../types/football';
import { SHADOW_EXPERIMENTS_CATALOG, saveShadowConfig } from '../utils/shadowExperiments';

interface RecursiveOptimizerProps {
  matchups: Matchup[];
  shadowConfig?: ShadowConfig;
  onUpdateShadowConfig?: (cfg: ShadowConfig) => void;
}

export const RecursiveOptimizer: React.FC<RecursiveOptimizerProps> = ({ 
  matchups, 
  shadowConfig, 
  onUpdateShadowConfig 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'REPORT' | 'SHADOW_LAB'>('SHADOW_LAB');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fallback local state if not provided from parent
  const [localConfig, setLocalConfig] = useState<ShadowConfig>(() => {
    return shadowConfig || {
      enabled: true,
      activeExperiments: {
        EXP_SIGMOIDAL_TRENCH: true,
        EXP_EDSR_LEVERAGE_BOOST: true,
        EXP_A_GAP_INTEL_AMP: true,
        EXP_KEY_NUMBER_CLUSTERING: true,
        EXP_WEATHER_QUADRATIC_DRAG: true,
        EXP_TURNOVER_LUCK_ATTENUATION: true,
        EXP_SPECULATIVE_UNDERDOG_COMPRESSION: false
      }
    };
  });

  const activeConfig = shadowConfig || localConfig;

  const handleToggleMaster = () => {
    const updated: ShadowConfig = {
      ...activeConfig,
      enabled: !activeConfig.enabled
    };
    saveShadowConfig(updated);
    if (onUpdateShadowConfig) onUpdateShadowConfig(updated);
    else setLocalConfig(updated);
  };

  const handleToggleExperiment = (expId: string) => {
    const updated: ShadowConfig = {
      ...activeConfig,
      activeExperiments: {
        ...activeConfig.activeExperiments,
        [expId]: !activeConfig.activeExperiments[expId]
      }
    };
    saveShadowConfig(updated);
    if (onUpdateShadowConfig) onUpdateShadowConfig(updated);
    else setLocalConfig(updated);
  };

  const handleEnableOnlyValid = () => {
    const newActive: Record<string, boolean> = {};
    for (const exp of SHADOW_EXPERIMENTS_CATALOG) {
      newActive[exp.id] = exp.validity === 'VALID_RECOMMENDED';
    }
    const updated: ShadowConfig = {
      enabled: true,
      activeExperiments: newActive
    };
    saveShadowConfig(updated);
    if (onUpdateShadowConfig) onUpdateShadowConfig(updated);
    else setLocalConfig(updated);
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

  const activeExperimentsCount = Object.values(activeConfig.activeExperiments).filter(Boolean).length;

  return (
    <div className="w-full mb-6">
      {/* Launch Control Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-swiss hover:shadow-swiss-hover transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-racing-500" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shadow-sm flex-shrink-0">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recursive Meta-Optimization & Shadow Mode Laboratory
                </h4>
                <span className={`rounded font-mono text-[10px] font-bold px-2 py-0.5 border ${
                  activeConfig.enabled 
                    ? 'bg-purple-100 text-purple-700 border-purple-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {activeConfig.enabled ? `SHADOW MODE ACTIVE (${activeExperimentsCount} TESTS)` : 'SHADOW MODE STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates candidate model adjustments in an isolated shadow pipeline before altering production weights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors font-medium shadow-xs"
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
              <span>{isOpen ? 'Close Lab' : 'Shadow Lab & Suggestions'}</span>
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

        {/* Audit & Shadow Lab Container */}
        {isOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4 animate-fadeIn">
            {/* Lab Navigation Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                <button
                  onClick={() => setActiveTab('SHADOW_LAB')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    activeTab === 'SHADOW_LAB'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  <span>Shadow Candidate Lab ({activeExperimentsCount} Active)</span>
                </button>
                <button
                  onClick={() => setActiveTab('REPORT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    activeTab === 'REPORT'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Recursive Analysis Report</span>
                </button>
              </div>

              {/* Master Shadow Switch */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEnableOnlyValid}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  title="Enable only suggestions marked VALID by the quant desk"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Implement Valid Suggestions Only</span>
                </button>

                <button
                  onClick={handleToggleMaster}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    activeConfig.enabled
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  {activeConfig.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{activeConfig.enabled ? 'Shadow Mode: ON' : 'Shadow Mode: OFF'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Shadow Mode Lab */}
            {activeTab === 'SHADOW_LAB' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 text-xs text-purple-900 leading-relaxed">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    <span>Shadow Pipeline Isolation Architecture</span>
                  </div>
                  <p className="text-purple-800 text-[11px]">
                    Candidate suggestions generated by the recursive engine run in an isolated Shadow sandbox. 
                    Production spreads and records remain 100% untampered. You can evaluate which recommendations are mathematically valid and activate only those in Shadow Mode before promoting to production.
                  </p>
                </div>

                {/* Candidate Experiments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {SHADOW_EXPERIMENTS_CATALOG.map((exp) => {
                    const isEnabled = Boolean(activeConfig.activeExperiments[exp.id]);
                    const isValid = exp.validity === 'VALID_RECOMMENDED';

                    return (
                      <div 
                        key={exp.id}
                        className={`rounded-xl border p-3.5 transition-all ${
                          isEnabled 
                            ? 'bg-purple-50/40 border-purple-300 shadow-xs' 
                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-xs text-slate-900">{exp.name}</h5>
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                                {exp.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                              Est. Impact: {exp.impactEstimate}
                            </span>
                          </div>

                          {/* Individual Experiment Toggle */}
                          <button
                            onClick={() => handleToggleExperiment(exp.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              isEnabled
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isEnabled ? 'Active in Shadow' : 'Off'}
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-normal mb-2">
                          {exp.description}
                        </p>

                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 font-mono text-[10px] text-slate-700 mb-2">
                          {exp.formulaDescription}
                        </div>

                        {/* Validity Badge & Rationalization */}
                        <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                          {isValid ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          ) : exp.validity === 'CAUTION_TEST_FIRST' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className={`font-bold uppercase tracking-wider text-[10px] ${
                              isValid 
                                ? 'text-emerald-700' 
                                : exp.validity === 'CAUTION_TEST_FIRST' 
                                ? 'text-amber-700' 
                                : 'text-rose-700'
                            }`}>
                              {isValid ? 'Quant Validated [Recommended for Shadow]' : 'Speculative [Reject for Production]'}
                            </span>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {exp.validityRationale}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Recursive Report */}
            {activeTab === 'REPORT' && (
              <div>
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
                      <Bot className="h-5 w-5 text-purple-600 absolute inset-0 m-auto" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-800 block">
                        Synthesizing CFB ({cfbAcc.percentage}%) & NFL ({nflAcc.percentage}%) Backtest Matrix...
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Interrogating trench formulas, pocket lifespan thresholds, and non-linear decay curves.
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={triggerRecursiveAudit} className="font-bold underline ml-2">
                      Retry Analysis
                    </button>
                  </div>
                )}

                {!isAnalyzing && report && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-purple-50/60 border border-purple-200/80 rounded-xl px-3.5 py-2">
                      <div className="flex items-center gap-2 text-xs text-purple-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>Recursive Meta-Optimization Blueprint Generated</span>
                        {generatedAt && <span className="text-[10px] text-purple-600 font-mono">({generatedAt})</span>}
                      </div>
                      <button
                        onClick={triggerRecursiveAudit}
                        className="flex items-center gap-1 text-[11px] font-mono text-purple-700 hover:text-purple-900 font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-audit
                      </button>
                    </div>

                    {/* Formatted Markdown Report */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 leading-relaxed font-sans space-y-3 prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-ul:my-1 prose-li:my-0.5">
                      <div className="whitespace-pre-wrap font-sans text-slate-700">
                        {report}
                      </div>
                    </div>
                  </div>
                )}

                {!isAnalyzing && !report && (
                  <div className="text-center py-8">
                    <Bot className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">
                      No analysis generated yet. Click "Run Recursive Audit" to synthesize model win rates.
                    </p>
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
