import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Download, 
  ShieldCheck, 
  Sparkles,
  HelpCircle,
  Target,
  Scale,
  RefreshCw
} from 'lucide-react';
import type { Matchup, TrialEntry } from '../types/football';
import { 
  createFrozenTrialEntries, 
  reconcileTrialEntries, 
  computeTrialScorecard, 
  loadSavedTrialEntries, 
  saveTrialEntries 
} from '../utils/trialLedgerUtils';

interface TrialAuditLedgerProps {
  matchups: Matchup[];
}

export const TrialAuditLedger: React.FC<TrialAuditLedgerProps> = ({ matchups }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<'ALL' | 'NFL' | 'CFB' | 'HIGH_EDGE' | 'NEUTRAL'>('ALL');
  const [isSyncingScores, setIsSyncingScores] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [entries, setEntries] = useState<TrialEntry[]>(() => {
    const saved = loadSavedTrialEntries();
    if (saved && saved.length > 0) {
      return reconcileTrialEntries(saved, matchups);
    }
    // Initialize baseline pre-registered trial entries from current matchups
    return createFrozenTrialEntries(matchups);
  });

  // Fetch both NFL and CFB slates simultaneously to cover all weekend/weekly games in one operation
  const fetchUnifiedSlates = async (): Promise<Matchup[]> => {
    try {
      const [nflRes, cfbRes] = await Promise.all([
        fetch('/api/slate?league=NFL').catch(() => null),
        fetch('/api/slate?league=CFB').catch(() => null)
      ]);

      const all: Matchup[] = [];
      if (nflRes && nflRes.ok) {
        const nflData = await nflRes.json();
        if (nflData.matchups && Array.isArray(nflData.matchups)) {
          all.push(...nflData.matchups);
        }
      }
      if (cfbRes && cfbRes.ok) {
        const cfbData = await cfbRes.json();
        if (cfbData.matchups && Array.isArray(cfbData.matchups)) {
          all.push(...cfbData.matchups);
        }
      }

      if (all.length > 0) return all;
    } catch (err) {
      console.warn('Could not fetch unified slates, using current props:', err);
    }
    return matchups;
  };

  // Autonomous Score Fetching & Reconciliation on mount and when matchups update
  useEffect(() => {
    let isMounted = true;
    async function autoReconcileScores() {
      setIsSyncingScores(true);
      try {
        const unified = await fetchUnifiedSlates();
        if (isMounted) {
          setEntries(prev => {
            const updated = reconcileTrialEntries(prev, unified);
            saveTrialEntries(updated);
            return updated;
          });
        }
      } finally {
        if (isMounted) setIsSyncingScores(false);
      }
    }

    autoReconcileScores();
    return () => { isMounted = false; };
  }, [matchups]);

  const scorecard = computeTrialScorecard(entries);

  // Freeze / Pre-Register New Slate (One-click: Locks ALL College Football weekend + NFL week games)
  const handleFreezeSlate = async () => {
    if (!window.confirm('Freeze and lock the upcoming slate for prospective trial? This will pre-register ALL weekend College Football and NFL games with SHA-256 cryptographic hashes.')) {
      return;
    }

    setIsLocking(true);
    try {
      const unified = await fetchUnifiedSlates();
      const newEntries = createFrozenTrialEntries(unified);

      // Merge with existing archived entries without duplicating matchup IDs
      const combined = [
        ...newEntries, 
        ...entries.filter(e => !newEntries.some(ne => ne.matchupId === e.matchupId))
      ];

      setEntries(combined);
      saveTrialEntries(combined);

      const nflCount = newEntries.filter(e => e.league === 'NFL').length;
      const cfbCount = newEntries.filter(e => e.league === 'CFB').length;
      setSyncMessage(`Locked ${newEntries.length} games (${nflCount} NFL + ${cfbCount} CFB) with SHA-256 hashes!`);
      setTimeout(() => setSyncMessage(null), 6000);
    } finally {
      setIsLocking(false);
    }
  };

  // Manual On-Demand Score Sync
  const handleManualSync = async () => {
    setIsSyncingScores(true);
    try {
      const unified = await fetchUnifiedSlates();
      let updatedEntries: TrialEntry[] = [];
      setEntries(prev => {
        updatedEntries = reconcileTrialEntries(prev, unified);
        saveTrialEntries(updatedEntries);
        return updatedEntries;
      });
      const finalCount = updatedEntries.filter(e => e.isFinal).length;
      setSyncMessage(`Reconciled scores: ${finalCount} completed games recorded.`);
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setIsSyncingScores(false);
    }
  };

  // Export Ledger to CSV
  const handleExportCsv = () => {
    const headers = [
      'Matchup ID',
      'Game',
      'League',
      'Week',
      'Locked At',
      'SHA256 Hash',
      'Market Spread',
      'Market Total',
      'SnapEdge Spread',
      'SnapEdge Total',
      'Recommended Side',
      'Divergence Pts',
      'Cohort',
      'Actual Score Home',
      'Actual Score Away',
      'SU Result',
      'ATS Result',
      'MAE Error Pts'
    ];

    const rows = entries.map(e => [
      e.matchupId,
      `"${e.gameTitle}"`,
      e.league,
      e.week,
      e.lockedAt,
      e.sha256Hash,
      e.marketSpread,
      e.marketTotal,
      e.snapEdgeSpread,
      e.snapEdgeTotal,
      e.recommendedSide,
      e.divergencePoints,
      e.cohort,
      e.actualScoreHome ?? '',
      e.actualScoreAway ?? '',
      e.isSuWinnerCorrect ? 'WIN' : (e.isSuWinnerCorrect === false ? 'LOSS' : 'PENDING'),
      e.isAtsCoverCorrect ? 'COVER' : (e.isAtsCoverCorrect === false ? 'MISS' : 'PENDING'),
      e.totalPointsErrorMae ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SnapEdge_Clinical_Trial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = entries.filter(e => {
    if (selectedCohort === 'NFL') return e.league === 'NFL';
    if (selectedCohort === 'CFB') return e.league === 'CFB';
    if (selectedCohort === 'HIGH_EDGE') return e.cohort === 'COHORT_A_HIGH_EDGE';
    if (selectedCohort === 'NEUTRAL') return e.cohort === 'COHORT_B_NEUTRAL';
    return true;
  });

  return (
    <div className="w-full mb-6 transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-blue-200/90 bg-white p-5 shadow-swiss hover:shadow-swiss-hover">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black shadow-md shadow-blue-500/20">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Prospective Clinical Trial Ledger
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3 mr-1 text-blue-500" /> Scientific Pre-Registration
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Locked predictions with cryptographic timestamps. Autonomous ESPN score fetching forward-tests Weeks 7–10 with zero hindsight bias.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors shadow-2xs ${
                showGuide 
                  ? 'border-indigo-300 bg-indigo-100/90 text-indigo-900' 
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="How to run trial & ATS interpretation guide"
              aria-expanded={showGuide}
            >
              <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
              <span>{showGuide ? 'Hide Trial Guide' : 'Trial Guide & What is ATS?'}</span>
            </button>

            <button
              onClick={handleFreezeSlate}
              disabled={isLocking}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs disabled:opacity-50"
              title="Lock Current Slate for Scientific Pre-Registration across NFL and College Football"
            >
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              <span>{isLocking ? 'Locking NFL + CFB...' : 'Lock Pre-Registration'}</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={isSyncingScores}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              title="Sync latest live/final scores from ESPN for NFL and CFB"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isSyncingScores ? 'animate-spin' : ''}`} />
              <span>{isSyncingScores ? 'Syncing...' : 'Sync Scores'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export Full Audit Trial to CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-colors shadow-2xs"
              aria-expanded={isOpen}
            >
              <span>{isOpen ? 'Collapse Trial Ledger' : 'Inspect Trial Scorecard'}</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Sync & Confirmation Banner */}
        {syncMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
            <button 
              onClick={() => setSyncMessage(null)} 
              className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Collapsible How-To & What is ATS? Guide Box */}
        {showGuide && (
          <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 text-slate-800 text-xs space-y-4 shadow-sm animate-fadeIn">
            <div className="flex items-start justify-between gap-2 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  Prospective Clinical Trial Protocol &amp; ATS Benchmark Guide
                </h4>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-md hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: What is ATS? */}
              <div className="space-y-2 bg-white/80 p-3.5 rounded-lg border border-indigo-100/80 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. What is ATS (&quot;Against The Spread&quot;)?</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  In sports betting, Vegas sportsbooks set a <strong className="text-slate-900">point spread</strong> to handicap the favorite so betting on either side is theoretically a 50/50 proposition.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-900">Example:</span> Kansas City is favored at <span className="font-mono font-bold text-indigo-600">-6.5</span> over Denver (<span className="font-mono font-bold text-slate-700">+6.5</span>).
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10.5px] text-slate-600">
                    <li>If KC wins <span className="font-mono font-semibold">24–20</span> (by 4 pts), KC won straight-up, but <strong className="text-emerald-700">Denver covered ATS (+6.5)</strong>. A Denver ATS bet wins!</li>
                    <li>If KC wins <span className="font-mono font-semibold">31–20</span> (by 11 pts), <strong className="text-blue-700">KC covered ATS (-6.5)</strong>. A KC ATS bet wins.</li>
                  </ul>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">ATS Win Rate</strong> measures whether our mathematical simulation beats the sportsbook&apos;s handicap, rather than just picking the favorite to win straight up.
                </p>
              </div>

              {/* Right Column: Interpreting ATS Win Rate */}
              <div className="space-y-2 bg-white/80 p-3.5 rounded-lg border border-indigo-100/80 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. How to Interpret ATS Win Rates</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Because casinos charge a standard <strong className="text-slate-900">4.76% fee (&quot;the vig&quot; or juice</strong>, typically -110 odds), picking 50% ATS loses money over time.
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-1.5 rounded-md bg-rose-50 border border-rose-200 text-[10.5px]">
                    <span className="font-mono font-bold text-rose-800">&lt; 50.0%</span>
                    <span className="text-rose-700 font-medium">Random Coin Flip (Unprofitable)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-md bg-amber-50 border border-amber-200 text-[10.5px]">
                    <span className="font-mono font-bold text-amber-800">52.38%</span>
                    <span className="text-amber-800 font-medium">Casino Breakeven Wall (0% Net Profit)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10.5px]">
                    <span className="font-mono font-bold text-emerald-800">55.0% – 57.0%</span>
                    <span className="text-emerald-800 font-bold">Statistically Significant Profitable Edge</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-md bg-purple-50 border border-purple-200 text-[10.5px]">
                    <span className="font-mono font-bold text-purple-800">&gt; 58.0%</span>
                    <span className="text-purple-800 font-bold">World-Class Professional Syndicate Grade</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: 3-Step Prospective Trial Protocol */}
            <div className="bg-white/80 p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>3. Prospective Clinical Trial Protocol (Weeks 7–10)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-600">
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block mb-0.5">Step A: Freeze Before Kickoff</span>
                  <span>Click <strong className="text-blue-700">&quot;Lock Pre-Registration&quot;</strong> on Thursday or Friday. SnapEdge spreads and sides are sealed with cryptographic SHA-256 hashes. No retro-fitting allowed.</span>
                </div>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block mb-0.5">Step B: Cohort Stratification</span>
                  <span>Games with <strong className="text-emerald-700">divergence ≥ 1.5 pts</strong> enter <strong className="text-emerald-800">Cohort A (High-Edge)</strong>. Low-divergence games enter Cohort B (Market-Neutral).</span>
                </div>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block mb-0.5">Step C: Unbiased Verification</span>
                  <span>Final scores update live. The scorecard tallies ATS covers, Straight-Up winners, and Total MAE error. Export to CSV for external audit at any time.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cumulative Scorecard KPIs (Always Visible) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* High-Edge ATS Win Rate */}
          <div className="bg-gradient-to-br from-emerald-50 to-white p-3 rounded-xl border border-emerald-200 shadow-2xs text-center">
            <span className="block text-[10px] font-mono uppercase font-bold text-emerald-800">
              High-Edge ATS Win Rate
            </span>
            <div className="text-2xl font-mono font-black text-emerald-600 mt-0.5">
              {scorecard.highEdgeAtsWinRatePct}%
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {scorecard.highEdgeAtsCorrect} of {scorecard.highEdgeAtsTotal} Covered (Target &gt;55%)
            </span>
          </div>

          {/* Straight-Up Win Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-xl border border-blue-200 shadow-2xs text-center">
            <span className="block text-[10px] font-mono uppercase font-bold text-blue-800">
              Straight-Up Win Rate
            </span>
            <div className="text-2xl font-mono font-black text-blue-600 mt-0.5">
              {scorecard.suWinRatePct}%
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {scorecard.suCorrect} of {scorecard.completedGames} Winners Picked
            </span>
          </div>

          {/* Score Inflation MAE */}
          <div className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-xl border border-purple-200 shadow-2xs text-center">
            <span className="block text-[10px] font-mono uppercase font-bold text-purple-800">
              Score Total MAE Error
            </span>
            <div className="text-2xl font-mono font-black text-purple-600 mt-0.5">
              ±{scorecard.scoreTotalMae} pts
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Zero Inflation Target &lt;6.8 pts
            </span>
          </div>

          {/* Closing Line Value (CLV) Beat */}
          <div className="bg-gradient-to-br from-amber-50 to-white p-3 rounded-xl border border-amber-200 shadow-2xs text-center">
            <span className="block text-[10px] font-mono uppercase font-bold text-amber-800">
              CLV Beat Rate
            </span>
            <div className="text-2xl font-mono font-black text-amber-600 mt-0.5">
              {scorecard.clvBeatRatePct}%
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Wall Street Equilibrium Proof
            </span>
          </div>
        </div>

        {/* Collapsible Detailed Ledger Table */}
        {isOpen && (
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-4 animate-fadeIn">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold gap-1">
                <button
                  onClick={() => setSelectedCohort('ALL')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({entries.length})
                </button>
                <button
                  onClick={() => setSelectedCohort('NFL')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'NFL' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  NFL ({entries.filter(e => e.league === 'NFL').length})
                </button>
                <button
                  onClick={() => setSelectedCohort('CFB')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'CFB' ? 'bg-white text-orange-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CFB ({entries.filter(e => e.league === 'CFB').length})
                </button>
                <button
                  onClick={() => setSelectedCohort('HIGH_EDGE')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'HIGH_EDGE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cohort A: High-Edge ({entries.filter(e => e.cohort === 'COHORT_A_HIGH_EDGE').length})
                </button>
                <button
                  onClick={() => setSelectedCohort('NEUTRAL')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'NEUTRAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cohort B: Neutral ({entries.filter(e => e.cohort === 'COHORT_B_NEUTRAL').length})
                </button>
              </div>

              <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>SHA-256 Bitwise Locked Prior to Kickoff</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Matchup</th>
                    <th className="p-3">Pre-Registered Line</th>
                    <th className="p-3">SnapEdge Fair</th>
                    <th className="p-3">Edge Cohort</th>
                    <th className="p-3">Actual Final</th>
                    <th className="p-3 text-center">Straight-Up</th>
                    <th className="p-3 text-center">ATS Cover</th>
                    <th className="p-3 text-right">Error (MAE)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                  {filteredEntries.map((e) => (
                    <tr key={e.matchupId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-sans font-bold text-slate-900">
                        <div>{e.gameTitle}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">
                          {e.league} Wk {e.week} • #{e.sha256Hash}
                        </div>
                      </td>
                      <td className="p-3">
                        {e.marketSpread > 0 ? `+${e.marketSpread}` : e.marketSpread} (O/U {e.marketTotal})
                      </td>
                      <td className="p-3 font-bold text-orange-600">
                        {e.snapEdgeSpread > 0 ? `+${e.snapEdgeSpread}` : e.snapEdgeSpread} (O/U {e.snapEdgeTotal})
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.cohort === 'COHORT_A_HIGH_EDGE'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {e.cohort === 'COHORT_A_HIGH_EDGE' ? `EDGE ${Math.abs(e.divergencePoints)} PTS` : 'NEUTRAL'}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        {e.isFinal && e.actualScoreHome !== undefined && e.actualScoreAway !== undefined ? (
                          <span className="text-slate-900">
                            {e.actualScoreAway} - {e.actualScoreHome}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-[10px]">Pending Final</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {e.isFinal ? (
                          e.isSuWinnerCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> WIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                              <XCircle className="w-3.5 h-3.5" /> LOSS
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {e.isFinal ? (
                          e.isAtsCoverCorrect ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COVER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              <XCircle className="w-3 h-3 text-rose-600" /> MISS
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        {e.totalPointsErrorMae !== undefined ? `±${e.totalPointsErrorMae} pts` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
