import { enrichTeamWithMicroData } from '../src/worker/nflverseConnector';
import { runMonteCarloSimulation } from '../src/utils/simulator';
import { runMarkovSimulation } from '../src/utils/markovSimulator';
import { CALIBRATED_LESSONS_CONFIG } from '../src/utils/engineTuning';
import type { Matchup } from '../src/types/football';

interface BacktestGameResult {
  week: number;
  id: string;
  awayTeam: string;
  homeTeam: string;
  actualAwayScore: number;
  actualHomeScore: number;
  actualTotal: number;
  actualMargin: number; // Home - Away
  marketSpread: number; // e.g. -3.5 (Home favored)
  marketTotal: number;
  snapEdgeSpread: number;
  snapEdgeTotal: number;
  divergence: number;
  recommendedSide: 'HOME' | 'AWAY';
  cohort: 'COHORT_A_HIGH_EDGE' | 'COHORT_B_NEUTRAL';
  isSuCorrect: boolean;
  isAtsCover: boolean;
  totalMae: number;
}

async function fetchNflWeekGames(week: number): Promise<any[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&limit=32`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    return data.events || [];
  } catch (err) {
    console.warn(`Error fetching week ${week}:`, err);
    return [];
  }
}

async function runBacktest() {
  console.log('================================================================');
  console.log('   SNAPEDGE RETROSPECTIVE NFL BACKTEST (WEEKS 1 TO 6)           ');
  console.log('================================================================\n');

  const allResults: BacktestGameResult[] = [];
  const weeksToTest = [1, 2, 3, 4, 5, 6];

  for (const week of weeksToTest) {
    process.stdout.write(`Fetching and simulating Week ${week}... `);
    const events = await fetchNflWeekGames(week);
    let weekCount = 0;

    for (const ev of events) {
      const comp = ev.competitions?.[0] || {};
      const statusType = comp.status?.type || {};
      const isCompleted = statusType.completed === true || statusType.state === 'post';
      if (!isCompleted) continue;

      const competitors = comp.competitors || [];
      const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
      const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

      if (!homeComp || !awayComp) continue;

      const homeScore = parseInt(homeComp.score || '0', 10);
      const awayScore = parseInt(awayComp.score || '0', 10);
      const homeTeamName = homeComp.team?.displayName || 'Home';
      const awayTeamName = awayComp.team?.displayName || 'Away';
      const homeAbbr = homeComp.team?.abbreviation || 'HOME';
      const awayAbbr = awayComp.team?.abbreviation || 'AWAY';

      // Odds
      const oddsObj = comp.odds?.[0] || {};
      const marketSpread = typeof oddsObj.spread === 'number' 
        ? oddsObj.spread 
        : (oddsObj.details && oddsObj.details.includes('-') 
            ? parseFloat(oddsObj.details.split('-')[1]) * -1 
            : -3.0);
      const marketTotal = typeof oddsObj.overUnder === 'number' && oddsObj.overUnder >= 20 ? oddsObj.overUnder : 44.5;

      // Microdata & Trench Win Rates
      const homeMicro = enrichTeamWithMicroData(homeAbbr, 'NFL');
      const awayMicro = enrichTeamWithMicroData(awayAbbr, 'NFL');

      const homePbwr = homeMicro ? homeMicro.pbwr : 64;
      const awayPbwr = awayMicro ? awayMicro.pbwr : 62;
      const homePrwr = homeMicro ? homeMicro.prwr : 54;
      const awayPrwr = awayMicro ? awayMicro.prwr : 52;

      // Build Matchup Object for simulation
      const mockMatchup: Matchup = {
        id: `nfl_w${week}_${ev.id}`,
        league: 'NFL',
        week,
        kickoffTime: ev.date || new Date().toISOString(),
        stadium: comp.venue?.fullName || 'Stadium',
        location: comp.venue?.address?.city || 'City',
        isDome: comp.venue?.indoor || false,
        surface: 'FieldTurf',
        status: 'FINAL',
        actualScore: { home: homeScore, away: awayScore },
        homeTeam: {
          id: homeComp.id || 'h',
          name: homeTeamName,
          abbreviation: homeAbbr,
          record: homeComp.records?.[0]?.summary || '3-2',
          offensiveLine: { passBlockWinRate: homePbwr, runBlockWinRate: 72 },
          defensiveLine: { passRushWinRate: homePrwr, runStopWinRate: 31 },
          trench: {
            passBlockWinRate: homePbwr,
            passRushWinRate: homePrwr,
            interiorPassBlockWinRate: homePbwr - 2,
            interiorPassRushWinRate: homePrwr - 1
          },
          earlyDownSuccessRate: homeMicro?.edsr ?? 52.0,
          epaPerPlay: homeMicro?.dropbackEpa ?? 0.08
        },
        awayTeam: {
          id: awayComp.id || 'a',
          name: awayTeamName,
          abbreviation: awayAbbr,
          record: awayComp.records?.[0]?.summary || '2-3',
          offensiveLine: { passBlockWinRate: awayPbwr, runBlockWinRate: 70 },
          defensiveLine: { passRushWinRate: awayPrwr, runStopWinRate: 30 },
          trench: {
            passBlockWinRate: awayPbwr,
            passRushWinRate: awayPrwr,
            interiorPassBlockWinRate: awayPbwr - 2,
            interiorPassRushWinRate: awayPrwr - 1
          },
          earlyDownSuccessRate: awayMicro?.edsr ?? 50.5,
          epaPerPlay: awayMicro?.dropbackEpa ?? 0.04
        },
        market: {
          spread: marketSpread,
          total: marketTotal,
          consensus: { homePct: 52, awayPct: 48, overPct: 51, underPct: 49 },
          closingSpread: marketSpread
        },
        model: {
          fairSpread: marketSpread,
          fairTotal: marketTotal,
          divergencePoints: 0,
          confidenceScore: 78,
          winProbability: 55,
          recommendedPlay: { side: 'HOME', edgePoints: 0, confidence: 'STANDARD' }
        },
        weather: {
          temperature: 65,
          windMph: 8,
          precipitationChance: 10,
          condition: 'Clear'
        }
      };

      // Run Monte Carlo & Markov Drive simulation
      const sim = runMonteCarloSimulation(mockMatchup, 3000);
      const markov = runMarkovSimulation(mockMatchup, 3000, CALIBRATED_LESSONS_CONFIG);

      // Blend continuous + discrete Markov expectations
      const snapEdgeSpread = Number(((sim.simulatedSpread * 0.4) + (markov.simulatedSpread * 0.6)).toFixed(1));
      const snapEdgeTotal = Number(((sim.simulatedTotal * 0.5) + (markov.simulatedTotal * 0.5)).toFixed(1));
      const divergence = Number((snapEdgeSpread - marketSpread).toFixed(1));

      const isHighEdge = Math.abs(divergence) >= 1.5;
      const cohort = isHighEdge ? 'COHORT_A_HIGH_EDGE' : 'COHORT_B_NEUTRAL';
      const recommendedSide: 'HOME' | 'AWAY' = divergence < 0 ? 'HOME' : 'AWAY';

      // Ground Truth Evaluation
      const actualMargin = homeScore - awayScore;
      const actualTotal = homeScore + awayScore;
      const actualWinner = actualMargin > 0 ? 'HOME' : 'AWAY';
      const predWinner = snapEdgeSpread < 0 ? 'HOME' : 'AWAY';
      const isSuCorrect = actualWinner === predWinner;

      // ATS Cover: Home covers if actualMargin > -marketSpread
      const homeCovered = actualMargin > -marketSpread;
      const isAtsCover = recommendedSide === 'HOME' ? homeCovered : !homeCovered;
      const totalMae = Number(Math.abs(actualTotal - snapEdgeTotal).toFixed(1));

      allResults.push({
        week,
        id: ev.id,
        awayTeam: awayTeamName,
        homeTeam: homeTeamName,
        actualAwayScore: awayScore,
        actualHomeScore: homeScore,
        actualTotal,
        actualMargin,
        marketSpread,
        marketTotal,
        snapEdgeSpread,
        snapEdgeTotal,
        divergence,
        recommendedSide,
        cohort,
        isSuCorrect,
        isAtsCover,
        totalMae
      });

      weekCount++;
    }
    console.log(`Evaluated ${weekCount} completed games.`);
  }

  // Summary Metrics
  const totalGames = allResults.length;
  const suWins = allResults.filter(r => r.isSuCorrect).length;
  const suWinRate = ((suWins / totalGames) * 100).toFixed(1);

  // Overall ATS
  const overallAtsCovers = allResults.filter(r => r.isAtsCover).length;
  const overallAtsWinRate = ((overallAtsCovers / totalGames) * 100).toFixed(1);

  // Cohort A: High-Edge
  const cohortA = allResults.filter(r => r.cohort === 'COHORT_A_HIGH_EDGE');
  const cohortACovers = cohortA.filter(r => r.isAtsCover).length;
  const cohortAWinRate = ((cohortACovers / cohortA.length) * 100).toFixed(1);

  // Cohort B: Neutral Control
  const cohortB = allResults.filter(r => r.cohort === 'COHORT_B_NEUTRAL');
  const cohortBCovers = cohortB.filter(r => r.isAtsCover).length;
  const cohortBWinRate = ((cohortBCovers / cohortB.length) * 100).toFixed(1);

  // Mean Absolute Error (MAE)
  const avgMae = (allResults.reduce((acc, r) => acc + r.totalMae, 0) / totalGames).toFixed(1);

  console.log('\n================================================================');
  console.log('   RETROSPECTIVE BACKTEST RESULTS SUMMARY                       ');
  console.log('================================================================');
  console.log(`Total Games Analyzed:         ${totalGames} (Weeks 1 to 6)`);
  console.log(`Straight-Up (SU) Win Rate:    ${suWinRate}% (${suWins} of ${totalGames} winners)`);
  console.log(`Overall ATS Win Rate:         ${overallAtsWinRate}% (${overallAtsCovers} of ${totalGames} covered)`);
  console.log('----------------------------------------------------------------');
  console.log(`COHORT A (High-Edge Active):  ${cohortAWinRate}% ATS Cover Rate (${cohortACovers}/${cohortA.length} games)`);
  console.log(`  Target Breakeven:           52.38% (Casino Vig -110)`);
  console.log(`  Net Edge Alpha:             +${(parseFloat(cohortAWinRate) - 52.38).toFixed(2)}% over casino barrier`);
  console.log('----------------------------------------------------------------');
  console.log(`COHORT B (Neutral Control):   ${cohortBWinRate}% ATS Cover Rate (${cohortBCovers}/${cohortB.length} games)`);
  console.log(`  Expected Control Value:     ~50.0% (Random market noise)`);
  console.log('----------------------------------------------------------------');
  console.log(`Total Points MAE Error:       ±${avgMae} pts (Zero Inflation Target <6.8)`);
  console.log('================================================================\n');

  console.log('TOP 10 HIGH-EDGE CONVICTION MATCHUPS AUDIT:\n');
  const topDivergent = [...cohortA].sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence)).slice(0, 10);
  console.table(topDivergent.map(g => ({
    Wk: g.week,
    Matchup: `${g.awayTeam} @ ${g.homeTeam}`,
    'Vegas Line': `${g.marketSpread > 0 ? '+' : ''}${g.marketSpread} (O/U ${g.marketTotal})`,
    'SnapEdge Fair': `${g.snapEdgeSpread > 0 ? '+' : ''}${g.snapEdgeSpread} (O/U ${g.snapEdgeTotal})`,
    'Edge (Pts)': `${Math.abs(g.divergence)} pts on ${g.recommendedSide}`,
    'Actual Score': `${g.actualAwayScore} - ${g.actualHomeScore}`,
    'ATS Result': g.isAtsCover ? 'COVER [WIN]' : 'MISS [LOSS]',
    'MAE (Pts)': `±${g.totalMae}`
  })));
}

runBacktest().catch(err => {
  console.error('Backtest error:', err);
  process.exit(1);
});
