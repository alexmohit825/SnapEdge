import React, { useState } from 'react';
import { 
  BrainCircuit, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  Scale, 
  ShieldCheck, 
  Flame, 
  Sparkles
} from 'lucide-react';

export const TruthEngineExplainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full mb-6 transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-white p-5 shadow-swiss hover:shadow-swiss-hover">
        {/* Kinetic Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Header Bar: Title, Pill & Toggle Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black shadow-md shadow-indigo-500/20">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  The "Truth Engine" Explained
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                  <Sparkles className="w-3 h-3 mr-1 text-indigo-500" /> In Simple English
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Why commercial sportsbooks don't tell you the truth, what RFID NextGen stats actually do, and where the real math edge lives.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-colors shadow-2xs"
            aria-expanded={isOpen}
          >
            <span>{isOpen ? 'Close Truth Guide' : 'How SnapEdge Finds The Real Score'}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Collapsible Deep-Dive Content */}
        {isOpen && (
          <div className="mt-5 border-t border-slate-100 pt-5 space-y-5 animate-fadeIn">
            {/* 3 Core Pillars in Plain English */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Pillar 1: The Sportsbook Illusion */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <Scale className="h-4 w-4" />
                  </div>
                  <span>1. The Sportsbook Secret</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sportsbooks like <strong>DraftKings, FanDuel, and ESPN BET</strong> are <strong>not</strong> trying to predict the exact final score of the game. They are financial risk managers.
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <p>
                    • They start with a baseline line, add a 4.76% fee (the vig), and then <strong>move the line based on where the public bets</strong>.
                  </p>
                  <p>
                    • If millions of fans blindly bet the Chiefs or Cowboys, the book inflates the line to protect their money—<strong>not</strong> because the Chiefs got better.
                  </p>
                </div>
              </div>

              {/* Pillar 2: NextGen RFID Chips vs Real Reality */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Radio className="h-4 w-4" />
                  </div>
                  <span>2. The NextGen Stats Myth</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The NFL uses <strong>NextGen Stats</strong> (RFID microchips in shoulder pads) to measure speed and coordinates 10 times a second.
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-100 text-[11px] text-slate-700 space-y-1">
                  <p>
                    • <strong>What it's good for:</strong> Cool video game graphics, broadcast TV stats, and seeing if a cornerback turned his hips 0.1 seconds late.
                  </p>
                  <p>
                    • <strong>Why it doesn't matter for game scores:</strong> MIT Sloan research proves tracking coordinates add massive statistical noise. A player's shoulder angle doesn't decide a 4-hour football game.
                  </p>
                </div>
              </div>

              {/* Pillar 3: What Actually Decides Football Scores */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Flame className="h-4 w-4" />
                  </div>
                  <span>3. The Physics That Actually Matter</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Games are decided by four simple, violent, measurable realities that SnapEdge models deterministically:
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-[11px] text-slate-700 space-y-1">
                  <p>
                    • <strong>Trench Pass Protection:</strong> When the interior line collapses in &lt;2.2 seconds, the play dies regardless of who the quarterback is.
                  </p>
                  <p>
                    • <strong>Possession Drive Chains:</strong> Simulating drives as discrete football scores (TDs, FGs, Punts, Turnovers) rather than toy bell curves.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Callout: The SnapEdge Advantage */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-indigo-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>THE UNMANIPULATED TRUTH ADVANTAGE</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
                  While commercial sportsbooks are busy balancing public bias and talking heads on TV push narratives, SnapEdge calculates the <strong>unmanipulated physical truth</strong> using 25 years of complete play-by-play micro-data. When the public inflates a line by 2 or 3 points, SnapEdge spots the vulnerability instantly.
                </p>
              </div>

              <div className="flex-shrink-0 text-center sm:text-right bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-indigo-200">DATA STANDARD</span>
                <span className="text-sm font-mono font-black text-emerald-400">100% OPEN & UNBIASED</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
