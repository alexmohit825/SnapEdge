import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Bot, 
  Calculator, 
  SlidersHorizontal, 
  Scale,
  Sparkles,
  TrendingUp,
  Target
} from 'lucide-react';

export const EdgeExplainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCOUT' | 'MATH' | 'WHATIF' | 'DIFFERENCE'>('OVERVIEW');

  return (
    <div className="w-full mb-6 transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-swiss">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-racing-500" />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white font-black shadow-orange-glow">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  How SnapEdge Gives You The Upper Hand
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600 border border-orange-200">
                  <Sparkles className="w-3 h-3 mr-1" /> Plain English Masterclass
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Converting overlooked football trench physics and Monte Carlo mathematics into an unfair betting advantage.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-expanded={isOpen}
          >
            <span>{isOpen ? 'Minimize' : 'Explore Edge'}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="mt-5 border-t border-slate-100 pt-4 animate-fadeIn">
            {/* Interactive Section Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>The Core Advantage</span>
              </button>

              <button
                onClick={() => setActiveTab('SCOUT')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'SCOUT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>What to Ask AI Scout</span>
              </button>

              <button
                onClick={() => setActiveTab('MATH')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'MATH'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>The Mathematical Engine</span>
              </button>

              <button
                onClick={() => setActiveTab('WHATIF')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'WHATIF'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>What "What-If" Actually Proves</span>
              </button>

              <button
                onClick={() => setActiveTab('DIFFERENCE')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'DIFFERENCE'
                    ? 'bg-racing-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-racing-600 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Us vs. Competitor Apps</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 animate-fadeIn">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-slate-200 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-center gap-2 text-racing-500 mb-1.5">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">1. The Line of Scrimmage</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Casual fans obsess over star quarterbacks. We analyze the offensive and defensive linemen. When pass protection fails in under 2.4 seconds, even elite quarterbacks struggle to throw.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-slate-200 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-center gap-2 text-blue-600 mb-1.5">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">2. Zero Data Entry</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You never type a single number. The app automatically tracks weekly depth charts, player injuries, local stadium weather, and live sportsbook odds.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-slate-200 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-center gap-2 text-amber-600 mb-1.5">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">3. Roster Talent Depth</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    In college football, blowouts against weak schools distort basic stats. We look past easy games and evaluate true 4-star and 5-star depth to see who holds up in the 4th quarter.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-slate-200 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-center gap-2 text-purple-600 mb-1.5">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">4. Clear Explanations</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    No mysterious black-box scores. Every prediction includes a clear breakdown showing how much each factor (linemen health, weather, rest) moves the predicted score.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: WHAT TO ASK AI SCOUT */}
            {activeTab === 'SCOUT' && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-blue-800">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    How "Ask AI Scout" Empowers Your Wagers
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The AI Scout isn't a chatbot telling you who will win — it is an elite NFL/CFB tactical analyst powered by <strong>Google Gemini 3.8 Flash</strong> that interrogates high-leverage film match-ups in milliseconds.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg bg-white p-3 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">
                      💡 Specific Questions to Ask the Scout:
                    </span>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><em>"How does the Left Tackle's injury affect our quarterback's average time to throw?"</em></li>
                      <li><em>"Is this underdog generating defensive Havoc Rate from edge rushers or secondary blitzes?"</em></li>
                      <li><em>"Will the 18 MPH crosswind eliminate the home team's deep vertical passing attack?"</em></li>
                      <li><em>"Why is the public hammering the favorite while the Sharp Money remains on the underdog?"</em></li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-white p-3 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">
                      🎯 How This Directly Informs Your Bet:
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sportsbooks set spreads to balance retail public betting, not to predict exact football outcomes. The Scout identifies when the public is betting on brand names (e.g., Dallas or Alabama) while ignoring a catastrophic guard-vs-defensive tackle mismatch that guarantees stalled drives and an underdog cover.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HOW PREDICTIONS ARE CALCULATED */}
            {activeTab === 'MATH' && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-orange-800">
                  <Calculator className="h-4 w-4 text-orange-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    The Key Factors Evaluated for Every Matchup
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  SnapEdge simulates thousands of virtual football games down-by-down. Instead of guessing, it measures the tangible physical advantages that win games:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-xs">
                    <span className="font-bold text-slate-900 block text-[11px]">Pass Protection vs. Defensive Rush</span>
                    <span className="text-slate-600 text-[11px]">
                      Measures whether the offensive line can protect the quarterback long enough to throw without getting sacked from the middle.
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-xs">
                    <span className="font-bold text-slate-900 block text-[11px]">Early Down Efficiency</span>
                    <span className="text-slate-600 text-[11px]">
                      Consistency on 1st and 2nd down. Teams that gain reliable yardage stay out of dangerous 3rd-and-long situations.
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-xs">
                    <span className="font-bold text-slate-900 block text-[11px]">Starting Field Position</span>
                    <span className="text-slate-600 text-[11px]">
                      Punting and kickoff coverage. Starting drives even 4 yards closer to the end zone translates to nearly 3 points per game.
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-xs">
                    <span className="font-bold text-slate-900 block text-[11px]">Quarterback Time to Throw</span>
                    <span className="text-slate-600 text-[11px]">
                      When protection breaks down under 2.4 seconds, completion rates plunge and turnovers double.
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-xs">
                    <span className="font-bold text-slate-900 block text-[11px]">Roster Talent Depth</span>
                    <span className="text-slate-600 text-[11px]">
                      Evaluates backup depth across the roster. Thinner rosters fatigue late in the 4th quarter against powerhouse programs.
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-xs">
                    <span className="font-bold text-slate-900 block text-[11px]">Stadium Wind &amp; Weather</span>
                    <span className="text-slate-600 text-[11px]">
                      Crosswinds over 12 MPH cause missed field goals and inaccurate deep passes, consistently lowering total points.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WHAT "WHAT-IF" ACTUALLY TELLS YOU */}
            {activeTab === 'WHATIF' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-purple-800">
                  <SlidersHorizontal className="h-4 w-4 text-purple-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Testing Team Strength with the What-If Studio
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  A team favored to win isn't guaranteed to win under all conditions. Football games turn on key player health and sudden weather shifts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-xs">
                    <span className="font-bold text-purple-900 block mb-1">
                      1. Spotting Fragile Favorites:
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Toggle &quot;Simulate Tackle Out&quot; in the What-If studio. If a 7-point favorite suddenly shrinks to a 2-point favorite, that team is <strong>fragile</strong>—heavily dependent on one player staying healthy.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-xs">
                    <span className="font-bold text-purple-900 block mb-1">
                      2. Blowouts vs. Close Finishes:
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      The score chart shows whether a game is likely to be a tight finish or a runaway blowout. This helps you choose whether to pick a comfortable margin or expect a nail-biter.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: HOW WE DIFFER FROM COMPETITORS */}
            {activeTab === 'DIFFERENCE' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-racing-600">
                  <Scale className="h-4 w-4 text-racing-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    SnapEdge vs. Competitors (Action Network, PFF, BetQL)
                  </h4>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-white rounded-lg border border-emerald-100 overflow-hidden shadow-xs">
                    <thead className="bg-emerald-100/60 text-emerald-900 font-mono text-[11px]">
                      <tr>
                        <th className="p-2.5">Feature</th>
                        <th className="p-2.5">Competitor Apps (PFF / Action / BetQL)</th>
                        <th className="p-2.5 text-racing-600 font-bold">SnapEdge Autonomous</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-bold">Transparency</td>
                        <td className="p-2.5 text-slate-500">Black box proprietary star rating. No explanation given.</td>
                        <td className="p-2.5 text-racing-600 font-bold">Itemized Receipts: Every single point of edge is accounted for.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Simulations</td>
                        <td className="p-2.5 text-slate-500">Static predictions frozen days before kickoff.</td>
                        <td className="p-2.5 text-racing-600 font-bold">Interactive Client-Side Monte Carlo: Perturb injuries & weather live.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">College Reality</td>
                        <td className="p-2.5 text-slate-500">Treats FCS blowout stats equal to SEC/Big Ten showdowns.</td>
                        <td className="p-2.5 text-racing-600 font-bold">Filters out cupcake games using 4/5-star Blue-Chip talent ratios.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">AI Scouting</td>
                        <td className="p-2.5 text-slate-500">Generic beat-writer articles locked behind $29.99/mo paywalls.</td>
                        <td className="p-2.5 text-racing-600 font-bold">Integrated Google Gemini 3.8 Flash real-time trench film scout.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
