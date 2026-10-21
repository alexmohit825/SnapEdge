import React from 'react';
import { 
  X, 
  HelpCircle, 
  Cpu, 
  Scale, 
  Clock, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 sm:p-8 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white font-black shadow-orange-glow">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-slate-900">
                  How SnapEdge Works
                </h3>
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700 border border-orange-200">
                  Plain English Guide
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                No sports betting jargon or complex math formulas required.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4 Core Concepts in Cards */}
        <div className="mt-6 space-y-5">
          
          {/* Step 1: The Core Mission */}
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm font-black text-sm">
                1
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">
                    What is SnapEdge Doing?
                  </h4>
                  <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                    The Appraisal Analogy
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Think of SnapEdge like a <strong>certified real estate appraiser</strong>. Vegas sportsbooks list the &ldquo;asking price&rdquo; (the point spread), which is shaped by public hype and fan bias. SnapEdge calculates what the game is <strong>actually worth</strong> based on hard physics.
                </p>
                <div className="mt-2 bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-3">
                  <div className="text-center flex-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Vegas Listing</span>
                    <span className="text-sm font-bold text-slate-800">Detroit by 3.5 pts</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="text-center flex-1">
                    <span className="block text-[10px] uppercase font-bold text-orange-600">SnapEdge Appraisal</span>
                    <span className="text-sm font-bold text-orange-600">Detroit by 7.0 pts</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-racing-500 shrink-0" />
                  <div className="text-center flex-1 bg-racing-50 p-1.5 rounded-lg border border-racing-200">
                    <span className="block text-[10px] uppercase font-bold text-racing-600">The Bargain (Edge)</span>
                    <span className="text-sm font-bold text-racing-700">+3.5 Pt Advantage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: How We Calculate Fair Value */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm font-black text-sm">
                2
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">
                    Simulating 3,000 Drives Per Game
                  </h4>
                  <span className="text-[10px] font-mono font-bold uppercase text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Physics over Opinions
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Instead of relying on talking heads on television, SnapEdge replays each game <strong>3,000 times play-by-play</strong> in milliseconds. It models:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Quarterback Pocket
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Does the offensive line give the QB at least 2.5 seconds to throw?
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" /> Stadium Wind
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Crosswinds over 12 MPH blow field goals off course and suppress deep passes.
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                      <Scale className="w-3.5 h-3.5 text-blue-600" /> Linemen Injuries
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Missing a starting Left Tackle causes immediate drive-killing sacks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Cheat Sheet for Spreads */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-racing-500 text-white shadow-sm font-black text-sm">
                3
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">
                    How to Read the Spread (The 10-Second Cheat Sheet)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono text-xs">(-) Minus = Favored to Win</span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">e.g. San Francisco -3.5</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      San Francisco must win the actual game by <strong>4 points or more</strong> for this pick to win (&ldquo;cover&rdquo;).
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono text-xs">(+) Plus = Underdog (Head Start)</span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">e.g. Washington +3.5</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Washington starts with a <strong>3.5 point head start</strong>. If Washington wins or loses by 3 or fewer points, this pick wins!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: The Clinical Trial & Accountability */}
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/60 via-white to-pink-50/40 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm font-black text-sm">
                4
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">
                    Scientific Clinical Trial (Zero Hindsight Bias)
                  </h4>
                  <span className="text-[10px] font-mono font-bold uppercase text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                    FDA Protocol Standard
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Most sports tipsters cherry-pick their wins after the game is over. SnapEdge operates like a formal medical trial:
                </p>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>Pre-Registered on Friday:</strong> All predictions are locked with SHA-256 digital timestamps before kickoff.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>Automatic Score Ingestion:</strong> Scores are fetched automatically from ESPN when games conclude on Sunday/Monday.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>Auditable CSV Export:</strong> You can download every locked pick and score to inspect in Excel anytime.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Button */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Got it, Let&apos;s See the Games
          </button>
        </div>
      </div>
    </div>
  );
};
