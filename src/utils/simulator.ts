import type { Matchup, SimulationResult, ShadowConfig, ShadowComparison, DeterminismCheckResult, EngineTuningConfig } from '../types/football';
import { runMarkovSimulation } from './markovSimulator';
import { runMarkovTensorSimulation } from './markovTensorEngine';

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
  tuningConfig?: EngineTuningConfig;
  engine?: 'MARKOV_TENSOR_5_5' | 'MARKOV_DRIVE' | 'GAUSSIAN_MACRO';
}

/**
 * SnapEdge High-Performance Deterministic Simulation Engine
 * Runs Tier-5.5 4,000-State Discrete Markov Transition Tensor by default for true down-and-distance precision,
 * or Absorbing Markov Drive Engine / Gaussian Macro Engine if explicitly requested.
 */
export function runMonteCarloSimulation(
  matchup: Matchup,
  perturbations: SimulationPerturbations = {},
  options: SimulationOptions = {}
): SimulationResult {
  // Use Tier 5.5 Markov State-Space Tensor by default
  if (options.engine === 'MARKOV_DRIVE') {
    return runMarkovSimulation(matchup, perturbations, options);
  }
  if (options.engine !== 'GAUSSIAN_MACRO') {
    return runMarkovTensorSimulation(matchup, perturbations, options);
  }

  const iterations = options.iterations ?? 10000;
  const isShadowMode = Boolean(options.isShadowMode || (options.shadowConfig && options.shadowConfig.enabled));
  const activeExps = (isShadowMode && options.shadowConfig) ? options.shadowConfig.activeExperiments : {};

  const tuning = options.tuningConfig;
  const trenchMultiplier = tuning?.trenchWeightMultiplier ?? 1.0;
  const edsrMult = tuning?.edsrMultiplier ?? 0.22;
  const windMult = tuning?.windPenaltyMultiplier ?? 1.0;
  const paceMult = tuning?.scoringPaceMultiplier ?? 1.0;
  const talentMult = tuning?.talentDisparityMultiplier ?? 1.0;

  // Derive stable seed for absolute determinism: same input -> same output
  const seedString = `${matchup.id}_${matchup.kickoffTime}_${matchup.homeTeam.id}_${matchup.awayTeam.id}_` +
    `${perturbations.windMphOverride ?? 'none'}_${perturbations.forceDome ? 1 : 0}_` +
    `${perturbations.homeQBOut ? 1 : 0}_${perturbations.homeLTOut ? 1 : 0}_` +
    `${perturbations.homeCenterOut ? 1 : 0}_${perturbations.awayDEOut ? 1 : 0}_` +
    `${isShadowMode ? 'SHADOW' : 'PROD'}_${iterations}_${JSON.stringify(activeExps)}_${tuning ? tuning.version : 'base'}`;

  const seed = options.seedOverride !== undefined ? options.seedOverride : hashStringToSeed(seedString);
  const prng = createMulberry32(seed);

  const { homeTeam, awayTeam, weather, market } = matchup;

  // 1. Calculate Calibrated Fair Spread (Home Margin = -activeSpread)
  let activeSpread = matchup.model?.fairSpread ?? matchup.market.spread;

  // In Shadow Mode, evaluate candidate adjustments to the spread
  if (isShadowMode) {
    // Sigmoidal trench adjustment in shadow
    if (activeExps['EXP_SIGMOIDAL_TRENCH']) {
      const homeMinPbwr = Math.min(homeTeam.trench.passBlockWinRate, homeTeam.trench.interiorPassBlockWinRate ?? (homeTeam.trench.passBlockWinRate - 2));
      const awayMinPbwr = Math.min(awayTeam.trench.passBlockWinRate, awayTeam.trench.interiorPassBlockWinRate ?? (awayTeam.trench.passBlockWinRate - 2));
      if (homeMinPbwr < 58) activeSpread += Math.pow((58 - homeMinPbwr) / 10, 1.4) * 0.45;
      if (awayMinPbwr < 58) activeSpread -= Math.pow((58 - awayMinPbwr) / 10, 1.4) * 0.45;
    }
    // EDSR leverage boost in shadow
    if (activeExps['EXP_EDSR_LEVERAGE_BOOST']) {
      const edsrDelta = ((homeTeam.earlyDownSuccessRate ?? 50.0) - (awayTeam.earlyDownSuccessRate ?? 50.0)) * 0.13;
      activeSpread -= edsrDelta;
    }
    // A-gap interior leverage in shadow
    if (activeExps['EXP_A_GAP_INTEL_AMP']) {
      const homeIntDiff = (homeTeam.trench.interiorPassBlockWinRate ?? 62) - (awayTeam.trench.interiorPassRushWinRate ?? 50);
      const awayIntDiff = (awayTeam.trench.interiorPassBlockWinRate ?? 60) - (homeTeam.trench.interiorPassRushWinRate ?? 52);
      activeSpread -= ((homeIntDiff - awayIntDiff) / 100) * 0.9;
    }
    // Turnover luck regression in shadow
    if (activeExps['EXP_TURNOVER_LUCK_ATTENUATION']) {
      const luckDelta = ((homeTeam.turnoverLuckDelta ?? 0) - (awayTeam.turnoverLuckDelta ?? 0)) * 0.20;
      activeSpread += luckDelta; // Regress unearned luck
    }
  }

  // Apply Recursive Engine Tuning Config if active
  if (tuning) {
    const homePBWR = homeTeam.trench.passBlockWinRate;
    const awayPRWR = awayTeam.trench.passRushWinRate;
    const awayPBWR = awayTeam.trench.passBlockWinRate;
    const homePRWR = homeTeam.trench.passRushWinRate;
    const trenchDiff = ((homePBWR - awayPRWR) - (awayPBWR - homePRWR)) / 100;
    activeSpread -= trenchDiff * 2.5 * (trenchMultiplier - 1.0);

    const edsrDiff = ((homeTeam.earlyDownSuccessRate ?? 50.0) - (awayTeam.earlyDownSuccessRate ?? 50.0));
    activeSpread -= (edsrDiff * (edsrMult - 0.22));

    if (matchup.league === 'CFB' && homeTeam.blueChipRatio && awayTeam.blueChipRatio) {
      const talentDelta = ((homeTeam.blueChipRatio - awayTeam.blueChipRatio) / 100);
      activeSpread -= talentDelta * 4.0 * (talentMult - 1.0);
    }
  }

  // Apply What-If Perturbations to Spread
  if (perturbations.homeQBOut) {
    activeSpread += 6.8; // Backup QB value degradation
  }
  if (perturbations.homeLTOut) {
    activeSpread += 3.4; // Blindside tackle collapse non-linear penalty
  }
  if (perturbations.homeCenterOut) {
    activeSpread += 4.2; // Fatal interior A-gap pocket collapse (MIT Sloan)
  }
  if (perturbations.awayDEOut) {
    activeSpread -= 2.2; // Edge rush Havoc reduction
  }

  // 2. Realistic Game Total Calibration (Anchored to Market & League Environment)
  const baselineTotal = (market && market.total && market.total >= 20)
    ? market.total
    : (matchup.league === 'CFB' ? 53.5 : 44.5);

  const activeWind = perturbations.forceDome 
    ? 0 
    : (perturbations.windMphOverride !== undefined ? perturbations.windMphOverride : weather.windMph);

  // Aerodynamic drag on passing EPA & field-goal trajectories grows non-linearly above 12 MPH
  const windPenalty = activeWind > 12 
    ? (isShadowMode && activeExps['EXP_WEATHER_QUADRATIC_DRAG']
        ? Math.pow(activeWind - 12, 1.6) * 0.28 * windMult
        : Math.pow(activeWind - 12, 1.5) * 0.22 * windMult)
    : 0;

  let totalInjuryDrag = 0;
  if (perturbations.homeQBOut) totalInjuryDrag += 3.4;
  if (perturbations.homeCenterOut) totalInjuryDrag += 1.8;

  const weatherTotalDrag = windPenalty * 1.35;
  const projectedGameTotal = Math.max(24.0, (baselineTotal * paceMult) - weatherTotalDrag - totalInjuryDrag);

  // 3. Calibrated Implied Team Means (Home Margin = -activeSpread)
  const expectedHomeScore = Math.max(3.0, (projectedGameTotal - activeSpread) / 2);
  const expectedAwayScore = Math.max(3.0, (projectedGameTotal + activeSpread) / 2);

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
  shadowConfig?: ShadowConfig,
  tuningConfig?: EngineTuningConfig
): ShadowComparison {
  const production = runMonteCarloSimulation(matchup, perturbations, { isShadowMode: false, tuningConfig });
  const shadow = runMonteCarloSimulation(matchup, perturbations, { isShadowMode: true, shadowConfig, tuningConfig });

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
