import type { Matchup, SimulationResult, ShadowConfig, ShadowComparison, DeterminismCheckResult } from '../types/football';

/**
 * Deterministic Pseudorandom Number Generator (Mulberry32)
 * Guarantees that identical game data, perturbations, and configurations produce 100% bitwise-identical output.
 */
function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a 32-bit hash function to derive stable deterministic seeds from matchup invariants
 */
export function hashStringToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export interface SimulationPerturbations {
  windMphOverride?: number;
  forceDome?: boolean;
  homeQBOut?: boolean;
  homeLTOut?: boolean;
  homeCenterOut?: boolean; // Interior A-Gap collapse toggle
  awayDEOut?: boolean;
}

export interface SimulationOptions {
  iterations?: number;
  seedOverride?: number;
  isShadowMode?: boolean;
  shadowConfig?: ShadowConfig;
}

/**
 * SnapEdge High-Performance Deterministic Monte Carlo Engine
 * Runs 10,000 iterations to generate discrete scoring distributions,
 * covering market spreads, blowout risks, parameter perturbations, and candidate shadow mode math.
 */
export function runMonteCarloSimulation(
  matchup: Matchup,
  perturbations: SimulationPerturbations = {},
  options: SimulationOptions = {}
): SimulationResult {
  const iterations = options.iterations ?? 10000;
  const isShadowMode = Boolean(options.isShadowMode || (options.shadowConfig && options.shadowConfig.enabled));
  const activeExps = (isShadowMode && options.shadowConfig) ? options.shadowConfig.activeExperiments : {};

  // Derive stable seed for absolute determinism: same input -> same output
  const seedString = `${matchup.id}_${matchup.kickoffTime}_${matchup.homeTeam.id}_${matchup.awayTeam.id}_` +
    `${perturbations.windMphOverride ?? 'none'}_${perturbations.forceDome ? 1 : 0}_` +
    `${perturbations.homeQBOut ? 1 : 0}_${perturbations.homeLTOut ? 1 : 0}_` +
    `${perturbations.homeCenterOut ? 1 : 0}_${perturbations.awayDEOut ? 1 : 0}_` +
    `${isShadowMode ? 'SHADOW' : 'PROD'}_${iterations}_${JSON.stringify(activeExps)}`;

  const seed = options.seedOverride !== undefined ? options.seedOverride : hashStringToSeed(seedString);
  const prng = createMulberry32(seed);

  const { homeTeam, awayTeam, weather, market } = matchup;

  // 1. Calculate Base Efficiency Vector (Adjusted EPA)
  let baseHomeStrength = (homeTeam.adjOffEpa - awayTeam.adjDefEpa) * 28 + 2.5; // +2.5 baseline home field
  let baseAwayStrength = (awayTeam.adjOffEpa - homeTeam.adjDefEpa) * 28;

  // 2. Scientific Variable: Early-Down Success Rate (EDSR) Drive Sustenance
  const homeEdsr = homeTeam.earlyDownSuccessRate ?? 50.0;
  const awayEdsr = awayTeam.earlyDownSuccessRate ?? 50.0;
  
  // Shadow Mode Experiment: Boost EDSR multiplier from 0.22 to 0.35 if candidate enabled
  const edsrMultiplier = (isShadowMode && activeExps['EXP_EDSR_LEVERAGE_BOOST']) ? 0.35 : 0.22;
  baseHomeStrength += (homeEdsr - 50.0) * edsrMultiplier;
  baseAwayStrength += (awayEdsr - 50.0) * edsrMultiplier;

  // 3. Scientific Variable: Special Teams Hidden Field Position Delta (FEI / ASFP)
  const homeStEpa = homeTeam.specialTeamsEpa ?? 0.0;
  const awayStEpa = awayTeam.specialTeamsEpa ?? 0.0;
  baseHomeStrength += homeStEpa * 14.0;
  baseAwayStrength += awayStEpa * 14.0;

  // 4. Adjust for College Blue-Chip Ratio disparity if CFB
  if (matchup.league === 'CFB' && homeTeam.blueChipRatio !== undefined && awayTeam.blueChipRatio !== undefined) {
    const talentDelta = (homeTeam.blueChipRatio - awayTeam.blueChipRatio) / 100;
    baseHomeStrength += talentDelta * 5.5; // Talent pedigree override
  }

  // 5. Scientific Variable: Micro-Level Trench Geometry (Interior A-Gap vs Edge)
  const interiorMultiplier = (isShadowMode && activeExps['EXP_A_GAP_INTEL_AMP']) ? 5.4 : 4.5;
  const useSigmoidalTrench = Boolean(isShadowMode && activeExps['EXP_SIGMOIDAL_TRENCH']);

  const calculateTrenchImpact = (pbwr: number, oppPrwr: number, interiorPbwr?: number, oppInteriorPrwr?: number) => {
    const edgeDiff = pbwr - oppPrwr;
    let impact = (edgeDiff / 100) * 3.0;

    // Interior C/OG vs DT A-Gap pressure multiplier
    const intPbwr = interiorPbwr ?? (pbwr - 2);
    const intPrwr = oppInteriorPrwr ?? (oppPrwr - 1);
    const interiorDiff = intPbwr - intPrwr;
    impact += (interiorDiff / 100) * interiorMultiplier;

    // Non-linear pocket breakdown penalty when either edge or interior collapses below 58%
    const minPbwr = Math.min(pbwr, intPbwr);
    if (minPbwr < 58) {
      if (useSigmoidalTrench) {
        // Shadow Mode candidate: Sigmoidal / logistic pocket lifespan collapse
        const collapseSeverity = Math.pow((58 - minPbwr) / 10, 1.4) * 2.85;
        impact -= collapseSeverity;
      } else {
        // Production baseline
        const collapseSeverity = Math.pow((58 - minPbwr) / 10, 1.4) * 2.4;
        impact -= collapseSeverity;
      }
    }
    return impact;
  };

  baseHomeStrength += calculateTrenchImpact(
    homeTeam.trench.passBlockWinRate,
    awayTeam.trench.passRushWinRate,
    homeTeam.trench.interiorPassBlockWinRate,
    awayTeam.trench.interiorPassRushWinRate
  );
  baseAwayStrength += calculateTrenchImpact(
    awayTeam.trench.passBlockWinRate,
    homeTeam.trench.passRushWinRate,
    awayTeam.trench.interiorPassBlockWinRate,
    awayTeam.trench.interiorPassRushWinRate
  );

  // 6. Scientific Variable: Turnover Luck Regression Filter
  const turnoverMultiplier = (isShadowMode && activeExps['EXP_TURNOVER_LUCK_ATTENUATION']) ? 0.65 : 0.45;
  if (homeTeam.turnoverLuckDelta) {
    baseHomeStrength -= homeTeam.turnoverLuckDelta * turnoverMultiplier;
  }
  if (awayTeam.turnoverLuckDelta) {
    baseAwayStrength -= awayTeam.turnoverLuckDelta * turnoverMultiplier;
  }

  // 7. Aerodynamic Quadratic Atmospheric Drag ("What-If" Studio & Radar)
  const activeWind = perturbations.forceDome 
    ? 0 
    : (perturbations.windMphOverride !== undefined ? perturbations.windMphOverride : weather.windMph);

  // Aerodynamic drag on passing EPA & field-goal trajectories grows non-linearly above 12 MPH
  const windPenalty = activeWind > 12 
    ? (isShadowMode && activeExps['EXP_WEATHER_QUADRATIC_DRAG']
        ? Math.pow(activeWind - 12, 1.6) * 0.28
        : Math.pow(activeWind - 12, 1.5) * 0.22)
    : 0;
  
  if (perturbations.homeQBOut) {
    baseHomeStrength -= 6.8; // Backup QB value degradation
  }
  if (perturbations.homeLTOut) {
    baseHomeStrength -= 3.4; // Blindside tackle collapse non-linear penalty
  }
  if (perturbations.homeCenterOut) {
    baseHomeStrength -= 4.2; // Fatal interior A-gap pocket collapse (MIT Sloan)
  }
  if (perturbations.awayDEOut) {
    baseAwayStrength -= 2.2; // Edge rush Havoc reduction
  }

  // Baseline expected points
  const expectedHomeScore = Math.max(9, 26 + baseHomeStrength - windPenalty);
  const expectedAwayScore = Math.max(9, 23.5 + baseAwayStrength - windPenalty);

  const scoreStdDev = matchup.league === 'CFB' ? 9.8 : 11.2;

  let homeWins = 0;
  let homeCovers = 0;
  let blowouts = 0;
  let totalHomePoints = 0;
  let totalAwayPoints = 0;
  
  const marginBuckets: { [margin: number]: number } = {};

  // Deterministic Box-Muller transform using seeded PRNG
  function sampleNormal(mean: number, std: number): number {
    const u1 = Math.max(1e-7, prng());
    const u2 = prng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return Math.round(Math.max(0, mean + z * std));
  }

  const useKeyNumberClustering = Boolean(isShadowMode && activeExps['EXP_KEY_NUMBER_CLUSTERING'] && matchup.league === 'NFL');

  for (let i = 0; i < iterations; i++) {
    const simHome = sampleNormal(expectedHomeScore, scoreStdDev);
    const simAway = sampleNormal(expectedAwayScore, scoreStdDev);
    
    totalHomePoints += simHome;
    totalAwayPoints += simAway;

    let margin = simHome - simAway; // Positive = Home win

    // Shadow Mode candidate: NFL Key Number Clustering (3, 7, 6, 10)
    if (useKeyNumberClustering) {
      if (margin === 2 || margin === 4) {
        if (prng() < 0.25) margin = 3;
      } else if (margin === 8 || margin === 6) {
        if (prng() < 0.20) margin = 7;
      }
    }

    if (margin > 0) {
      homeWins++;
    }

    if (margin > -market.spread) {
      homeCovers++;
    }

    if (Math.abs(margin) >= 14) {
      blowouts++;
    }

    // Bucket margins between -30 and +30 for distribution chart
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
    seedUsed: seed,
    isDeterministic: true
  };
}

/**
 * Programmatic Determinism Check
 * Runs simulation repeatedly with the exact same inputs and asserts 0.00% variance.
 */
export function verifyDeterminism(
  matchup: Matchup,
  perturbations: SimulationPerturbations = {},
  options: SimulationOptions = {}
): DeterminismCheckResult {
  const iterations = options.iterations ?? 10000;
  
  const run1 = runMonteCarloSimulation(matchup, perturbations, { ...options, iterations });
  const run2 = runMonteCarloSimulation(matchup, perturbations, { ...options, iterations });

  const spreadVariance = Math.abs(run1.simulatedSpread - run2.simulatedSpread);
  const winPctVariance = Math.abs(run1.homeWinPct - run2.homeWinPct);

  const isDeterministic = spreadVariance === 0 && winPctVariance === 0 &&
    run1.simulatedTotal === run2.simulatedTotal &&
    run1.projectedScoreHome === run2.projectedScoreHome &&
    run1.projectedScoreAway === run2.projectedScoreAway;

  return {
    isDeterministic,
    seed: run1.seedUsed ?? 0,
    iterations,
    runCount: 2,
    spreadVariance,
    winPctVariance,
    hashSignature: `${run1.seedUsed}_${run1.simulatedSpread}_${run1.homeWinPct}`
  };
}

/**
 * Comparison Utility: Evaluates Production vs Shadow Mode simultaneously
 */
export function runComparisonSimulation(
  matchup: Matchup,
  perturbations: SimulationPerturbations = {},
  shadowConfig?: ShadowConfig
): ShadowComparison {
  const production = runMonteCarloSimulation(matchup, perturbations, { isShadowMode: false });
  const shadow = runMonteCarloSimulation(matchup, perturbations, { isShadowMode: true, shadowConfig });

  const spreadDelta = Number((shadow.simulatedSpread - production.simulatedSpread).toFixed(2));
  const winPctDelta = Number((shadow.homeWinPct - production.homeWinPct).toFixed(2));
  const activeExperimentsCount = shadowConfig?.activeExperiments 
    ? Object.values(shadowConfig.activeExperiments).filter(Boolean).length 
    : 0;

  return {
    production,
    shadow,
    spreadDelta,
    winPctDelta,
    activeExperimentsCount
  };
}
