import type { Matchup, SimulationResult } from '../types/football';

/**
 * SnapEdge High-Performance Monte Carlo Engine
 * Runs 10,000 iterations to generate discrete scoring distributions,
 * covering market spreads, blowout risks, and parameter perturbations.
 */
export function runMonteCarloSimulation(
  matchup: Matchup,
  perturbations: {
    windMphOverride?: number;
    forceDome?: boolean;
    homeQBOut?: boolean;
    homeLTOut?: boolean;
    awayDEOut?: boolean;
  } = {},
  iterations: number = 10000
): SimulationResult {
  const { homeTeam, awayTeam, weather, market } = matchup;

  // 1. Calculate Base Efficiency Vector
  let baseHomeStrength = (homeTeam.adjOffEpa - awayTeam.adjDefEpa) * 28 + 2.5; // +2.5 baseline home field
  let baseAwayStrength = (awayTeam.adjOffEpa - homeTeam.adjDefEpa) * 28;

  // 2. Adjust for College Blue-Chip Ratio disparity if CFB
  if (matchup.league === 'CFB' && homeTeam.blueChipRatio !== undefined && awayTeam.blueChipRatio !== undefined) {
    const talentDelta = (homeTeam.blueChipRatio - awayTeam.blueChipRatio) / 100;
    baseHomeStrength += talentDelta * 5.5; // Talent pedigree override
  }

  // 3. Trench Leverage Vector (Pass Protection vs Rush Havoc)
  const homePassProtectionDiff = homeTeam.trench.passBlockWinRate - awayTeam.trench.passRushWinRate;
  const awayPassProtectionDiff = awayTeam.trench.passBlockWinRate - homeTeam.trench.passRushWinRate;
  
  baseHomeStrength += (homePassProtectionDiff / 100) * 4.0;
  baseAwayStrength += (awayPassProtectionDiff / 100) * 4.0;

  // 4. Apply Dynamic User Perturbations ("What-If" Studio)
  const activeWind = perturbations.forceDome 
    ? 0 
    : (perturbations.windMphOverride !== undefined ? perturbations.windMphOverride : weather.windMph);

  // High wind penalizes passing games and deep scoring
  const windPenalty = Math.max(0, (activeWind - 12) * 0.35);
  
  if (perturbations.homeQBOut) {
    baseHomeStrength -= 6.8; // Backup QB value degradation
  }
  if (perturbations.homeLTOut) {
    baseHomeStrength -= 2.9; // Blindside tackle collapse
  }
  if (perturbations.awayDEOut) {
    baseAwayStrength -= 2.2; // Edge rush Havoc reduction
  }

  // Baseline expected points
  const expectedHomeScore = Math.max(10, 26 + baseHomeStrength - windPenalty);
  const expectedAwayScore = Math.max(10, 23.5 + baseAwayStrength - windPenalty);

  // Standard deviation of NFL/CFB single-game scoring drives
  const scoreStdDev = matchup.league === 'CFB' ? 10.5 : 8.8;

  let homeWins = 0;
  let homeCovers = 0;
  let blowouts = 0;
  let totalHomePoints = 0;
  let totalAwayPoints = 0;
  
  const marginBuckets: { [margin: number]: number } = {};

  // Standard Box-Muller transform for normal distribution
  function sampleNormal(mean: number, std: number): number {
    const u1 = Math.max(1e-7, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return Math.round(Math.max(0, mean + z * std));
  }

  for (let i = 0; i < iterations; i++) {
    const simHome = sampleNormal(expectedHomeScore, scoreStdDev);
    const simAway = sampleNormal(expectedAwayScore, scoreStdDev);
    
    totalHomePoints += simHome;
    totalAwayPoints += simAway;

    const margin = simHome - simAway; // Positive = Home win

    if (simHome > simAway) {
      homeWins++;
    }

    // Cover market spread check (e.g. market.spread = -3.5 means home must win by > 3.5)
    if (margin > -market.spread) {
      homeCovers++;
    }

    if (Math.abs(margin) >= 14) {
      blowouts++;
    }

    // Bucket margins between -35 and +35 for distribution chart
    const clampedMargin = Math.max(-30, Math.min(30, margin));
    marginBuckets[clampedMargin] = (marginBuckets[clampedMargin] || 0) + 1;
  }

  const projHome = Number((totalHomePoints / iterations).toFixed(1));
  const projAway = Number((totalAwayPoints / iterations).toFixed(1));
  const simSpread = Number((projAway - projHome).toFixed(1)); // Negative means home favored
  const simTotal = Number((projHome + projAway).toFixed(1));

  // Convert distribution to array sorted by margin
  const distributionScores = Object.entries(marginBuckets)
    .map(([m, count]) => ({ margin: parseInt(m, 10), count }))
    .sort((a, b) => a.margin - b.margin);

  return {
    simulatedSpread: simSpread,
    simulatedTotal: simTotal,
    homeWinPct: Number(((homeWins / iterations) * 100).toFixed(1)),
    awayWinPct: Number((((iterations - homeWins) / iterations) * 100).toFixed(1)),
    blowoutRiskPct: Number(((blowouts / iterations) * 100).toFixed(1)),
    coverSpreadPct: Number(((homeCovers / iterations) * 100).toFixed(1)),
    projectedScoreHome: projHome,
    projectedScoreAway: projAway,
    distributionScores,
  };
}
