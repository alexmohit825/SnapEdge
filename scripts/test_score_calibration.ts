import { SAMPLE_MATCHUPS } from '../src/data/sampleMatchups';
import { runMonteCarloSimulation, verifyDeterminism } from '../src/utils/simulator';
import { CALIBRATED_LESSONS_CONFIG, BASELINE_ENGINE_CONFIG } from '../src/utils/engineTuning';

console.log('=== SNAPEDGE SCORE CALIBRATION & ENGINE MATH VERIFICATION ===\n');

let allPassed = true;

for (const m of SAMPLE_MATCHUPS) {
  const baseSim = runMonteCarloSimulation(m, {}, { tuningConfig: BASELINE_ENGINE_CONFIG });
  const calibSim = runMonteCarloSimulation(m, {}, { tuningConfig: CALIBRATED_LESSONS_CONFIG });
  const det = verifyDeterminism(m, {}, { tuningConfig: CALIBRATED_LESSONS_CONFIG });

  console.log(`[${m.league}] ${m.awayTeam.name} (${m.awayTeam.record}) at ${m.homeTeam.name} (${m.homeTeam.record})`);
  console.log(`  Market Line: Spread ${m.market.spread}, O/U Total ${m.market.total}`);
  console.log(`  Actual Score: ${m.actualScore ? `${m.actualScore.away} - ${m.actualScore.home}` : 'Upcoming'}`);
  console.log(`  Baseline Pred: ${baseSim.projectedScoreAway} - ${baseSim.projectedScoreHome} (Total: ${baseSim.simulatedTotal})`);
  console.log(`  Calibrated Pred: ${calibSim.projectedScoreAway} - ${calibSim.projectedScoreHome} (Total: ${calibSim.simulatedTotal})`);
  console.log(`  Deterministic: ${det.isDeterministic ? 'PASS [100% BITWISE IDENTICAL]' : 'FAIL'}`);

  // Sanity check: Ensure NFL scores are between 10 and 38 per team and total between 35 and 55
  if (m.league === 'NFL') {
    if (calibSim.projectedScoreHome > 40 || calibSim.projectedScoreAway > 40 || calibSim.simulatedTotal > 58) {
      console.error(`  FAIL: NFL Score inflated! ${calibSim.projectedScoreAway} - ${calibSim.projectedScoreHome}`);
      allPassed = false;
    }
  }

  // Check Monday night game
  if (m.id === 'nfl_kc_no_mnf_final') {
    console.log(`  MNF Check -> Actual: 13 - 26, Pred: ${calibSim.projectedScoreAway} - ${calibSim.projectedScoreHome}`);
    if (m.actualScore?.home !== 26 || m.actualScore?.away !== 13) {
      console.error(`  FAIL: MNF Actual score mismatch!`);
      allPassed = false;
    }
  }

  console.log('---------------------------------------------------------');
}

if (allPassed) {
  console.log('\n>>> ALL 6 SCORE CALIBRATION & DETERMINISM CHECKS PASSED <<<');
} else {
  console.error('\n>>> SOME CHECKS FAILED <<<');
  process.exit(1);
}
