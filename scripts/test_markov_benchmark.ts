import { SAMPLE_MATCHUPS } from '../src/data/sampleMatchups';
import { runMarkovSimulation } from '../src/utils/markovSimulator';
import { CALIBRATED_LESSONS_CONFIG } from '../src/utils/engineTuning';

console.log('=== ABSORBING MARKOV DRIVE SIMULATOR BENCHMARK ===\n');

for (const m of SAMPLE_MATCHUPS) {
  const start = performance.now();
  const sim = runMarkovSimulation(m, 5000, CALIBRATED_LESSONS_CONFIG);
  const dur = (performance.now() - start).toFixed(2);

  console.log(`[${m.league}] ${m.awayTeam.name} at ${m.homeTeam.name}`);
  console.log(`  Sportsbook Line: Spread ${m.market.spread}, Total ${m.market.total}`);
  console.log(`  Actual Score: ${m.actualScore ? `${m.actualScore.away} - ${m.actualScore.home}` : 'Upcoming'}`);
  console.log(`  Markov Simulated Pred: ${sim.projectedScoreAway} - ${sim.projectedScoreHome} (Total: ${sim.simulatedTotal})`);
  console.log(`  Markov Simulated Spread: ${sim.simulatedSpread} | Win Prob: Away ${sim.awayWinPct}% - Home ${sim.homeWinPct}%`);
  console.log(`  Execution Time (5,000 games): ${dur} ms`);
  console.log('--------------------------------------------------');
}
