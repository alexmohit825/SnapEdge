import { useState, useEffect } from 'react';
import { SAMPLE_MATCHUPS } from './data/sampleMatchups';
import type { League, Matchup } from './types/football';
import { EdgeExplainer } from './components/EdgeExplainer';
import { MatchupCard } from './components/MatchupCard';
import { 
  Zap, 
  GraduationCap, 
  Trophy, 
  RefreshCw,
  Search
} from 'lucide-react';

export function App() {
  const [selectedLeague, setSelectedLeague] = useState<League>('CFB');
  const [filterType, setFilterType] = useState<'ALL' | 'HIGH_EDGE' | 'TOP_25' | 'WIND'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchups, setMatchups] = useState<Matchup[]>(SAMPLE_MATCHUPS);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Automatically fetch live weekly schedule from Cloudflare Ingestion API
  useEffect(() => {
    let isMounted = true;
    async function loadLiveSlate() {
      setIsLoadingFeed(true);
      try {
        const res = await fetch(`/api/slate?league=${selectedLeague}`);
        if (res.ok) {
          const data = await res.json();
          if (data.matchups && data.matchups.length > 0 && isMounted) {
            const currentSamples = SAMPLE_MATCHUPS.filter(m => m.league === selectedLeague);
            const liveOnly = data.matchups.filter((lm: Matchup) => 
              !currentSamples.some(s => s.homeTeam.name === lm.homeTeam.name)
            );
            setMatchups([...currentSamples, ...liveOnly]);
            setIsLiveFeed(true);
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
  }, [selectedLeague]);

  // Filter matchups
  const filteredMatchups = matchups.filter((m) => {
    if (m.league !== selectedLeague) return false;

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-orange-500 selection:text-white pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 font-black text-white shadow-orange-glow">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">SnapEdge</span>
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-orange-600 border border-orange-200">
                  SWISS PRO
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-500 sm:block font-medium">
                Autonomous Football Intelligence & Trench Physics
              </p>
            </div>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 shadow-xs">
              <span className={`h-2 w-2 rounded-full ${isLiveFeed ? 'bg-racing-500 animate-pulse' : 'bg-blue-500'}`} />
              <span className="font-mono text-[11px] font-semibold">
                {isLoadingFeed ? 'SYNCING SCHEDULE...' : isLiveFeed ? 'AUTONOMOUS LIVE FEED' : 'OFFLINE BASELINE'}
              </span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
              title="Refresh Feeds"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* Beginner-Friendly Explainer Hub */}
        <EdgeExplainer />

        {/* League Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
            <button
              onClick={() => setSelectedLeague('CFB')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                selectedLeague === 'CFB'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-4 w-4 text-orange-500" />
              <span>Saturday College (CFB)</span>
            </button>

            <button
              onClick={() => setSelectedLeague('NFL')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                selectedLeague === 'NFL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Trophy className="h-4 w-4 text-orange-500" />
              <span>Sunday Pro (NFL)</span>
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors shadow-xs ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              All Matchups
            </button>

            <button
              onClick={() => setFilterType('HIGH_EDGE')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors shadow-xs ${
                filterType === 'HIGH_EDGE'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>High Value Edge (2+ Pts)</span>
            </button>

            {selectedLeague === 'CFB' && (
              <button
                onClick={() => setFilterType('TOP_25')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors shadow-xs ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors shadow-xs ${
                filterType === 'WIND'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              Wind Impact (&gt;12 MPH)
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${selectedLeague} teams (e.g., Ohio State, Texas, Chiefs, Lions)...`}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>

        {/* Matchup Cards Feed */}
        {filteredMatchups.length > 0 ? (
          <div>
            {filteredMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
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
      </main>
    </div>
  );
}

export default App;
