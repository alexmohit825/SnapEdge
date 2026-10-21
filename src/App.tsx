import { useState, useEffect, useMemo } from 'react';
import { SAMPLE_MATCHUPS } from './data/sampleMatchups';
import type { League, Matchup, ShadowConfig, EngineTuningConfig } from './types/football';
import { EdgeExplainer } from './components/EdgeExplainer';
import { TruthEngineExplainer } from './components/TruthEngineExplainer';
import { CLVAuditDashboard } from './components/CLVAuditDashboard';
import { TrialAuditLedger } from './components/TrialAuditLedger';
import { AccuracyStats } from './components/AccuracyStats';
import { RecursiveOptimizer } from './components/RecursiveOptimizer';
import { MatchupCard } from './components/MatchupCard';
import { TopValueSpotlight } from './components/TopValueSpotlight';
import { HowItWorksModal } from './components/HowItWorksModal';
import { getInitialShadowConfig } from './utils/shadowExperiments';
import { getInitialEngineTuningConfig } from './utils/engineTuning';
import { auditSlateSanity } from './utils/sanityGuardrails';
import { 
  Zap, 
  GraduationCap, 
  Trophy, 
  RefreshCw,
  Search,
  Calendar,
  HelpCircle,
  FlaskConical,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function App() {
  const [selectedLeague, setSelectedLeague] = useState<League>('NFL');
  const [selectedWeek, setSelectedWeek] = useState<number>(6); // Active Week 6 (Oct 14-20)
  const [hasExplicitWeek, setHasExplicitWeek] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'HIGH_EDGE' | 'TOP_25' | 'WIND'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchups, setMatchups] = useState<Matchup[]>(() => auditSlateSanity(SAMPLE_MATCHUPS).sanitizedSlate);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [shadowConfig, setShadowConfig] = useState<ShadowConfig>(getInitialShadowConfig());
  const [tuningConfig, setTuningConfig] = useState<EngineTuningConfig>(getInitialEngineTuningConfig());
  
  // High-Level 3-Tab View Navigation (Eliminates Endless Scroll Clutter)
  const [activeTab, setActiveTab] = useState<'GAMES' | 'TRACK_RECORD' | 'ENGINE_LAB'>('GAMES');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Switch default week when league toggles
  const handleLeagueChange = (league: League) => {
    setSelectedLeague(league);
    setHasExplicitWeek(false);
    setSelectedWeek(6);
  };

  // Automatically fetch live weekly schedule from Cloudflare Ingestion API
  useEffect(() => {
    let isMounted = true;
    async function loadLiveSlate() {
      setIsLoadingFeed(true);
      try {
        const query = hasExplicitWeek ? `?league=${selectedLeague}&week=${selectedWeek}` : `?league=${selectedLeague}`;
        const res = await fetch(`/api/slate${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.matchups && data.matchups.length > 0 && isMounted) {
            // Strictly enforce sanity rules across dates, scores, injuries, trench win rates
            const { sanitizedSlate } = auditSlateSanity(data.matchups);
            setMatchups(sanitizedSlate);
            setIsLiveFeed(true);
            if (!hasExplicitWeek && data.currentWeek) {
              setSelectedWeek(data.currentWeek);
            }
          }
        }
      } catch (err) {
        console.error('Using baseline pre-computed matchups:', err);
      } finally {
        if (isMounted) setIsLoadingFeed(false);
      }
    }

    loadLiveSlate();
    return () => { isMounted = false; };
  }, [selectedLeague, selectedWeek, hasExplicitWeek]);

  // Current League Matchups (Memoized)
  const leagueMatchups = useMemo(() => {
    return matchups.filter(m => m.league === selectedLeague);
  }, [matchups, selectedLeague]);

  const highEdgeCount = useMemo(() => {
    return leagueMatchups.filter(m => Math.abs(m.model.divergencePoints) >= 2.0).length;
  }, [leagueMatchups]);

  // Filter matchups (Memoized)
  const filteredMatchups = useMemo(() => {
    return leagueMatchups.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.homeTeam.name.toLowerCase().includes(q) || 
                            m.awayTeam.name.toLowerCase().includes(q) ||
                            m.homeTeam.abbreviation.toLowerCase().includes(q) ||
                            m.awayTeam.abbreviation.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      if (filterType === 'HIGH_EDGE') {
        return Math.abs(m.model.divergencePoints) >= 2.0;
      }
      if (filterType === 'TOP_25') {
        return (m.homeTeam.rank !== undefined && m.homeTeam.rank <= 25) || 
               (m.awayTeam.rank !== undefined && m.awayTeam.rank <= 25);
      }
      if (filterType === 'WIND') {
        return m.weather.windMph >= 12;
      }

      return true;
    });
  }, [leagueMatchups, searchQuery, filterType]);

  // Group matchups by Date Header (Memoized)
  const groupedMatchups = useMemo(() => {
    const getGameDateKey = (m: Matchup): string => {
      if (m.dateHeader) return m.dateHeader;
      try {
        const d = new Date(m.kickoffTime);
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      } catch {
        return `Week ${m.week} Matchups`;
      }
    };

    const grouped: { [date: string]: Matchup[] } = {};
    for (const m of filteredMatchups) {
      const key = getGameDateKey(m);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return grouped;
  }, [filteredMatchups]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-orange-500 selection:text-white pb-20">
      
      {/* Friendly How-It-Works Modal */}
      <HowItWorksModal 
        isOpen={isHowItWorksOpen} 
        onClose={() => setIsHowItWorksOpen(false)} 
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-black text-white shadow-orange-glow">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">SnapEdge</span>
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-orange-600 border border-orange-200">
                  PRO
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-500 sm:block font-medium">
                Independent Football Intelligence & Line Strength Analysis
              </p>
            </div>
          </div>

          {/* Right Action Hub: How It Works & Live Feed Pill */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors shadow-2xs"
              title="Explain how SnapEdge works in plain English"
            >
              <HelpCircle className="h-4 w-4 text-orange-600" />
              <span className="hidden sm:inline">How It Works</span>
              <span className="sm:hidden">Guide</span>
            </button>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 shadow-2xs">
              <span className={`h-2 w-2 rounded-full ${isLiveFeed ? 'bg-racing-500 animate-pulse' : 'bg-blue-500'}`} />
              <span className="font-mono text-[11px] font-semibold hidden md:inline">
                {isLoadingFeed ? 'SYNCING SCHEDULE...' : isLiveFeed ? 'LIVE SCORES & ODDS' : 'OFFLINE BASELINE'}
              </span>
              <span className="font-mono text-[11px] font-semibold md:hidden">
                {isLiveFeed ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Refresh Feeds"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Floating 3-Tab Segmented Controller */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('GAMES')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'GAMES'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Trophy className="h-3.5 w-3.5 text-orange-400" />
                <span>Games &amp; Picks</span>
                {highEdgeCount > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    activeTab === 'GAMES' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {highEdgeCount} Edges
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('TRACK_RECORD')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'TRACK_RECORD'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5 text-blue-400" />
                <span>Track Record &amp; Trial</span>
                <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                  activeTab === 'TRACK_RECORD' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  62.5% ATS
                </span>
              </button>

              <button
                onClick={() => setActiveTab('ENGINE_LAB')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'ENGINE_LAB'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                <span>Engine Lab</span>
                <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold hidden md:inline ${
                  activeTab === 'ENGINE_LAB' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  3,000 Sims
                </span>
              </button>
            </div>

            {/* League Switcher (Pro NFL vs College Football) */}
            <div className="hidden sm:flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
              <button
                onClick={() => handleLeagueChange('NFL')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedLeague === 'NFL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Trophy className="h-3.5 w-3.5 text-orange-500" />
                <span>NFL</span>
              </button>

              <button
                onClick={() => handleLeagueChange('CFB')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedLeague === 'CFB'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5 text-orange-500" />
                <span>College (CFB)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">

        {/* Mobile League Selector */}
        <div className="sm:hidden mb-4 flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
          <button
            onClick={() => handleLeagueChange('NFL')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              selectedLeague === 'NFL'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-orange-500" />
            <span>NFL Pro</span>
          </button>
          <button
            onClick={() => handleLeagueChange('CFB')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              selectedLeague === 'CFB'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5 text-orange-500" />
            <span>College (CFB)</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: 🏈 GAMES & PICKS (THE CLEAN, FAST HOME EXPERIENCE) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'GAMES' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Friendly 10-Second Explainer Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-200/90 bg-gradient-to-r from-orange-50 via-white to-amber-50/60 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 sm:text-sm">
                    How to Read SnapEdge Picks
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    We simulate 3,000 drives per game. When our fair value differs from Vegas by 2+ points, you have an <strong className="text-orange-700">Edge (Bargain)</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-white border border-orange-200 rounded-xl px-3 py-1.5 hover:bg-orange-50 transition-colors shadow-2xs shrink-0"
              >
                <span>Read 2-Min Guide</span>
                <ArrowRight className="h-3.5 w-3.5 text-orange-600" />
              </button>
            </div>

            {/* Top Value Spotlight Showcase */}
            <TopValueSpotlight matchups={leagueMatchups} />

            {/* Filter Bar & Quick Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors shadow-2xs ${
                    filterType === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  All Matchups ({leagueMatchups.length})
                </button>

                <button
                  onClick={() => setFilterType('HIGH_EDGE')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors shadow-2xs ${
                    filterType === 'HIGH_EDGE'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>High Value (2+ Pts)</span>
                  {highEdgeCount > 0 && (
                    <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px] font-mono">
                      {highEdgeCount}
                    </span>
                  )}
                </button>

                {selectedLeague === 'CFB' && (
                  <button
                    onClick={() => setFilterType('TOP_25')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors shadow-2xs ${
                      filterType === 'TOP_25'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Top 25 Showdowns
                  </button>
                )}

                <button
                  onClick={() => setFilterType('WIND')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors shadow-2xs ${
                    filterType === 'WIND'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  Wind Impact (&gt;12 MPH)
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${selectedLeague} teams...`}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-2xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Week Navigation Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-400 mr-1 flex-shrink-0">
                Week:
              </span>
              {[5, 6, 7].map((w) => {
                const dateRange = w === 5 ? 'OCT 7-13' : w === 6 ? 'OCT 14-20' : 'OCT 21-27';
                const isCurrent = selectedWeek === w;
                return (
                  <button
                    key={w}
                    onClick={() => {
                      setHasExplicitWeek(true);
                      setSelectedWeek(w);
                    }}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all flex items-center gap-2 flex-shrink-0 shadow-2xs ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/10'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span>WEEK {w}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                      isCurrent ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {dateRange}
                    </span>
                    {w === 6 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Active Game Day" />
                    )}
                  </button>
                );
              })}
              {Array.from({ length: (selectedLeague === 'CFB' ? 15 : 18) - 7 }, (_, i) => i + 8).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setHasExplicitWeek(true);
                    setSelectedWeek(w);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all flex-shrink-0 shadow-2xs ${
                    selectedWeek === w
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Wk {w}
                </button>
              ))}
            </div>

            {/* Matchup Cards Feed Grouped by Date */}
            {filteredMatchups.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedMatchups).map(([dateLabel, games]) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                        {dateLabel}
                      </h3>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        ({games.length} {games.length === 1 ? 'Matchup' : 'Matchups'})
                      </span>
                      <span className="h-px bg-slate-200 flex-1 ml-2" />
                    </div>

                    <div className="space-y-4">
                      {games.map((matchup) => (
                        <MatchupCard 
                          key={matchup.id} 
                          matchup={matchup} 
                          shadowConfig={shadowConfig} 
                          tuningConfig={tuningConfig}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-swiss">
                <p className="text-sm text-slate-500">No matchups match the current filter.</p>
                <button
                  onClick={() => { setFilterType('ALL'); setSearchQuery(''); }}
                  className="mt-3 text-xs text-orange-600 font-bold underline hover:text-orange-700"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: 🔬 TRACK RECORD & PROSPECTIVE TRIAL (PROOF & AUDIT) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'TRACK_RECORD' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Explainer Callout */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/40 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Prospective Scientific Verification (No Hindsight Bias)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  All predictions are locked before Friday kickoff with SHA-256 digital timestamps. Real scores are ingested automatically from ESPN on Sunday/Monday.
                </p>
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 border border-blue-200 font-mono">
                FDA Clinical Trial Protocol
              </span>
            </div>

            {/* Prediction Accuracy Percentage KPIs */}
            <AccuracyStats matchups={matchups} />

            {/* 4-Week Prospective Scientific Trial Audit Ledger */}
            <TrialAuditLedger matchups={matchups} />

            {/* Institutional Closing Line Value (CLV) Alpha Audit Dashboard */}
            <CLVAuditDashboard matchups={matchups} />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: ⚙️ ENGINE LAB & SIMULATION TUNING (FOR POWER USERS)   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ENGINE_LAB' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Explainer Callout */}
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/80 via-white to-pink-50/40 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Simulation Physics &amp; NextGen Stats Lab
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Adjust simulation parameters like offensive line protection weights and aerodynamic wind drag. Compare our play-by-play model with public betting sentiment.
                </p>
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 border border-purple-200 font-mono">
                Interactive Studio
              </span>
            </div>

            {/* Recursive Learning & Meta-Optimization Engine with Direct Math Tuning */}
            <RecursiveOptimizer 
              matchups={matchups} 
              shadowConfig={shadowConfig} 
              onUpdateShadowConfig={setShadowConfig}
              tuningConfig={tuningConfig}
              onUpdateTuningConfig={setTuningConfig}
            />

            {/* Beginner-Friendly Explainer Hub */}
            <EdgeExplainer />

            {/* The Truth Engine: Sportsbooks vs NextGen Stats in Simple English */}
            <TruthEngineExplainer />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;