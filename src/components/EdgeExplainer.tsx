import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Cpu, 
  GraduationCap, 
  SlidersHorizontal, 
  FileCheck2,
  Sparkles
} from 'lucide-react';

export const EdgeExplainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full mb-6 transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-slate-850/80 to-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
        {/* Glow ambient accent */}
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  How SnapEdge Gives You The Upper Hand
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-400/20">
                  <Sparkles className="w-3 h-3 mr-1" /> Plain English
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Converting overlooked football details into mathematically proven edge.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            aria-expanded={isOpen}
          >
            <span>{isOpen ? 'Minimize' : 'Why This Works'}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="mt-5 grid grid-cols-1 gap-3.5 border-t border-slate-700/60 pt-4 sm:grid-cols-2 lg:grid-cols-5 animate-fadeIn">
            {/* Card 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">1. The Trenches</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fans watch the quarterback; we watch the 300-lb linemen. If a star QB doesn't have 2.5 seconds to throw because of an injured tackle, his offense will stall.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-cyan-400 mb-1.5">
                <Cpu className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">2. Zero Data Entry</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You never type a single stat. SnapEdge automatically pulls depth charts, practice injury reports, stadium weather radars, and referee crew tendencies on its own.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 mb-1.5">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">3. Real College Math</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                College football is heavily lopsided. A 50-point blowout against a weak school is meaningless. We factor in 5-star recruit ratios, transfer portals, and defensive strength.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-purple-400 mb-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">4. "What-If" Studio</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Wondering what happens if 20 mph wind hits or the star running back sits out? Tap one toggle to simulate 10,000 games on your device instantly.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                <FileCheck2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">5. The Receipts</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                No mysterious "black boxes." Every prediction displays an itemized receipt showing the exact 3 or 4 hidden facts that tip the odds in our favor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
