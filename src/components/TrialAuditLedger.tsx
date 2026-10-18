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
  Sparkles
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
  const [selectedCohort, setSelectedCohort] = useState<'ALL' | 'HIGH_EDGE' | 'NEUTRAL'>('ALL');
  const [entries, setEntries] = useState<TrialEntry[]>(() => {
    const saved = loadSavedTrialEntries();
    if (saved && saved.length > 0) {
      return reconcileTrialEntries(saved, matchups);
    }
    // Initialize baseline pre-registered trial entries from current matchups
    return createFrozenTrialEntries(matchups);
  });

  // Reconcile whenever matchups update (e.g. game scores go final)
  useEffect(() => {
    setEntries(prev => {
      const updated = reconcileTrialEntries(prev, matchups);
      saveTrialEntries(updated);
      return updated;
    });
  }, [matchups]);

  const scorecard = computeTrialScorecard(entries);

  // Freeze / Pre-Register New Slate Button
  const handleFreezeSlate = () => {
    if (window.confirm('Freeze and lock current slate for prospective trial? Existing games will remain archived.')) {
      const newEntries = createFrozenTrialEntries(matchups);
      const combined = [...newEntries, ...entries.filter(e => !newEntries.some(ne => ne.matchupId === e.matchupId))];
      setEntries(combined);
      saveTrialEntries(combined);
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
                Locked predictions with cryptographic timestamps. Proves accuracy forward-testing across Weeks 7-10 with zero hindsight bias.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFreezeSlate}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs"
              title="Lock Current Slate for Scientific Pre-Registration"
            >
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              <span>Lock Pre-Registration</span>
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
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                <button
                  onClick={() => setSelectedCohort('ALL')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All Pre-Registered ({entries.length})
                </button>
                <button
                  onClick={() => setSelectedCohort('HIGH_EDGE')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'HIGH_EDGE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Cohort A: High-Edge ({entries.filter(e => e.cohort === 'COHORT_A_HIGH_EDGE').length})
                </button>
                <button
                  onClick={() => setSelectedCohort('NEUTRAL')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedCohort === 'NEUTRAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
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
