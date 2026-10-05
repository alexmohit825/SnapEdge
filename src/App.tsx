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
            // Merge sample deep-trench games with live ingested schedule
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
    // 1. League Filter
    if (m.league !== selectedLeague) return false;

    // 2. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = m.homeTeam.name.toLowerCase().includes(q) || 
                          m.awayTeam.name.toLowerCase().includes(q) ||
                          m.homeTeam.abbreviation.toLowerCase().includes(q) ||
                          m.awayTeam.abbreviation.toLowerCase().includes(q);
      if (!matchesName) return false;
    }

    // 3. Quick Tag Filter
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
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 font-black text-slate-950 shadow-md shadow-emerald-500/20">
              <Zap className="h-5 w-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">SnapEdge</span>
                <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-400/30">
                  PRO
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Autonomous Football Intelligence & Trench Physics
              </p>
            </div>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
              <span className={`h-2 w-2 rounded-full ${isLiveFeed ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
              <span className="font-mono text-[11px]">
                {isLoadingFeed ? 'SYNCING SCHEDULE...' : isLiveFeed ? 'AUTONOMOUS LIVE FEED' : 'OFFLINE BASELINE'}
              </span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
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
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              onClick={() => setSelectedLeague('CFB')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                selectedLeague === 'CFB'
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Saturday College (CFB)</span>
            </button>

            <button
              onClick={() => setSelectedLeague('NFL')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                selectedLeague === 'NFL'
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Sunday Pro (NFL)</span>
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterType === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-600'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              All Matchups
            </button>

            <button
              onClick={() => setFilterType('HIGH_EDGE')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterType === 'HIGH_EDGE'
                  ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>High Value Edge (2+ Pts)</span>
            </button>

            {selectedLeague === 'CFB' && (
              <button
                onClick={() => setFilterType('TOP_25')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                  filterType === 'TOP_25'
                    ? 'bg-slate-800 text-white border-slate-600'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Top 25 Showdowns
              </button>
            )}

            <button
              onClick={() => setFilterType('WIND')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterType === 'WIND'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              Wind Impact (&gt;12 MPH)
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${selectedLeague} teams (e.g., Ohio State, Texas, Chiefs, Lions)...`}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-colors"
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <p className="text-sm text-slate-400">No matchups match the current filter.</p>
            <button
              onClick={() => { setFilterType('ALL'); setSearchQuery(''); }}
              className="mt-3 text-xs text-emerald-400 underline hover:text-emerald-300"
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
