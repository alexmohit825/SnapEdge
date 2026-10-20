import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ShieldCheck, 
  Award,
  Sparkles
} from 'lucide-react';
import type { Matchup } from '../types/football';
import { auditSlateCLV } from '../utils/clvEngine';

interface CLVAuditDashboardProps {
  matchups: Matchup[];
}

export const CLVAuditDashboard: React.FC<CLVAuditDashboardProps> = ({ matchups }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { records, clvBeatRatePct, averageAlphaBps } = auditSlateCLV(matchups);

  return (
    <div className="w-full mb-6 transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-white p-5 shadow-swiss hover:shadow-swiss-hover">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black shadow-md shadow-emerald-500/20">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Beating Vegas Early: Closing Line Value (CLV)
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-500" /> Market Proof
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Measures whether our picks got you better odds early in the week before Vegas moved the line by kickoff.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs">
              <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 font-bold">
                {clvBeatRatePct}% BEAT FINAL VEGAS LINE
              </span>
              <span className="rounded-lg bg-teal-100 text-teal-800 px-2.5 py-1 font-bold">
                +{averageAlphaBps} BPS VALUE
              </span>
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs"
              aria-expanded={isOpen}
            >
              <span>{isOpen ? 'Close Explainer' : 'How We Beat Vegas Early'}</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Audit Records Table */}
        {isOpen && (
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-4 animate-fadeIn">
            <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>In Plain English:</strong> Any single game can be swayed by a lucky tipped pass or bad referee call. 
                <strong> Closing Line Value (CLV)</strong> is like buying stock at \$50 before it rises to \$60. If SnapEdge spots a bargain on Wednesday (e.g. recommending Denver at +7) and by Sunday kickoff Vegas drops the line to +4, you got 3 free points of cushion. Regularly beating the final kickoff line is the purest proof of an accurate model.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Matchup</th>
                    <th className="p-3">Opening Market</th>
                    <th className="p-3 text-orange-600 font-bold">SnapEdge Fair</th>
                    <th className="p-3">Closing Market</th>
                    <th className="p-3">CLV Delta</th>
                    <th className="p-3 text-right">Syndicate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                  {records.map((r) => (
                    <tr key={r.matchupId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-sans font-bold text-slate-900">
                        {r.gameTitle}
                      </td>
                      <td className="p-3">
                        {r.openingSpread > 0 ? `+${r.openingSpread}` : r.openingSpread}
                      </td>
                      <td className="p-3 font-bold text-orange-600">
                        {r.snapEdgeFairSpread > 0 ? `+${r.snapEdgeFairSpread}` : r.snapEdgeFairSpread}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {r.closingSpread > 0 ? `+${r.closingSpread}` : r.closingSpread}
                      </td>
                      <td className="p-3 text-emerald-600 font-bold">
                        +{r.clvAlphaBps} bps
                      </td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'CLV_BEAT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.status === 'CLV_BEAT' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              BEAT CLOSING LINE
                            </>
                          ) : (
                            'MARKET EQUILIBRIUM'
                          )}
                        </span>
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
