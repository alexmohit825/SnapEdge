import type { Matchup, SimulationResult, EngineTuningConfig } from '../types/football';
import type { SimulationPerturbations, SimulationOptions } from './simulator';

/**
 * Deterministic Pseudorandom Number Generator (Mulberry32)
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

export function hashStringToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export interface DriveOutcome {
  points: number;
  type: 'TOUCHDOWN' | 'FIELD_GOAL' | 'PUNT' | 'TURNOVER' | 'TURNOVER_DOWNS' | 'SAFETY';
  plays: number;
  yardsGained: number;
  reachedRedZone: boolean;
}

/**
 * Field Goal Probability Logistic Curve calibrated to modern NFL kicking accuracy (2024-2026)
 */
function calcFieldGoalProb(distanceYards: number, windMph: number): number {
  if (distanceYards <= 25) return 0.98;
  if (distanceYards <= 35) return 0.94;
  if (distanceYards <= 45) return 0.86 - (windMph > 12 ? (windMph - 12) * 0.015 : 0);
  if (distanceYards <= 52) return 0.74 - (windMph > 12 ? (windMph - 12) * 0.025 : 0);
  if (distanceYards <= 60) return 0.55 - (windMph > 12 ? (windMph - 12) * 0.035 : 0);
  return 0.25;
}

/**
 * Simulates an individual offensive possession drive using an Absorbing Markov Chain
 */
export function simulateMarkovDrive(
  offensePBWR: number,
  defensePRWR: number,
  edsrPct: number, // Early-Down Success Rate (e.g. 52.0)
  startYardline: number, // 1 to 99 (100 = TD)
  windMph: number,
  prng: () => number
): DriveOutcome {
  let yardline = Math.min(95, Math.max(10, Math.round(startYardline)));
  let down = 1;
  let distanceToGo = 10;
  let plays = 0;
  const initialYard = yardline;
  let reachedRedZone = yardline >= 80;

  // Trench mismatch leverage
  const trenchDelta = (offensePBWR - defensePRWR) / 100;
  const isAGapCollapsed = offensePBWR < 58;

  while (plays < 18) {
    plays++;
    if (yardline >= 80) reachedRedZone = true;
    const isEarlyDown = down === 1 || down === 2;

    // Determine play success probability
    let successProb = isEarlyDown ? (edsrPct / 100) : ((edsrPct - 8) / 100);
    successProb += trenchDelta * 0.35;

    // Check catastrophic turnover/sack
    const turnoverRoll = prng();
    if (turnoverRoll < 0.018 + (isAGapCollapsed ? 0.015 : 0)) {
      return {
        points: 0,
        type: 'TURNOVER',
        plays,
        yardsGained: yardline - initialYard,
        reachedRedZone
      };
    }

    // Play yardage realization
    let yardsGained = 0;
    if (prng() < successProb) {
      // Successful play: lognormal-like yardage distribution
      const roll = prng();
      if (roll < 0.60) yardsGained = 3 + Math.floor(prng() * 5); // 3 - 7 yds
      else if (roll < 0.88) yardsGained = 8 + Math.floor(prng() * 9); // 8 - 16 yds
      else yardsGained = 18 + Math.floor(prng() * 25); // Explosive play 18 - 42 yds
    } else {
      // Unsuccessful play: 0 gain or tackle for loss/sack
      const failRoll = prng();
      if (failRoll < 0.22 && isAGapCollapsed) yardsGained = -(3 + Math.floor(prng() * 5)); // Sack / TFL
      else yardsGained = Math.floor(prng() * 2); // 0 or 1 yd
    }

    yardline += yardsGained;
    if (yardline >= 80) reachedRedZone = true;

    // Check absorbing Touchdown state
    if (yardline >= 100) {
      const extraPoint = prng() < 0.97 ? 1 : (prng() < 0.48 ? 2 : 0);
      return {
        points: 6 + extraPoint,
        type: 'TOUCHDOWN',
        plays,
        yardsGained: 100 - initialYard,
        reachedRedZone: true
      };
    }

    // Check 1st down conversion
    if (yardsGained >= distanceToGo) {
      down = 1;
      distanceToGo = Math.min(10, 100 - yardline);
    } else {
      down++;
      distanceToGo -= yardsGained;
      if (distanceToGo <= 0) distanceToGo = 1;

      // 4th Down Decision Gate
      if (down > 4) {
        if (yardline >= 65) {
          const fgDistance = (100 - yardline) + 17;
          const fgProb = calcFieldGoalProb(fgDistance, windMph);
          if (prng() < fgProb) {
            return {
              points: 3,
              type: 'FIELD_GOAL',
              plays,
              yardsGained: yardline - initialYard,
              reachedRedZone
            };
          } else {
            return {
              points: 0,
              type: 'TURNOVER_DOWNS',
              plays,
              yardsGained: yardline - initialYard,
              reachedRedZone
            };
          }
        } else if (yardline >= 58 && distanceToGo <= 2 && prng() < 0.45) {
          if (prng() < 0.55) {
            down = 1;
            distanceToGo = 10;
            continue;
          } else {
            return {
              points: 0,
              type: 'TURNOVER_DOWNS',
              plays,
              yardsGained: yardline - initialYard,
              reachedRedZone
            };
          }
        } else {
          return {
            points: 0,
            type: 'PUNT',
            plays,
            yardsGained: yardline - initialYard,
            reachedRedZone
          };
        }
      }
    }
  }

  return { points: 0, type: 'PUNT', plays, yardsGained: yardline - initialYard, reachedRedZone };
}

/**
 * Full Game Markov Drive Monte Carlo Engine (5,000 Game Iterations)
 * Simulates genuine possession sequences naturally producing discrete football scores (3, 7, 10, etc.)
 */
export function runMarkovSimulation(
  matchup: Matchup,
  perturbationsOrIterations: SimulationPerturbations | number = {},
  optionsOrTuning?: SimulationOptions | EngineTuningConfig,
  legacyPerturbations: SimulationPerturbations = {}
): SimulationResult {
  let perturbations: SimulationPerturbations = {};
  let options: SimulationOptions = {};

  if (typeof perturbationsOrIterations === 'number') {
    options.iterations = perturbationsOrIterations;
    if (optionsOrTuning && 'version' in optionsOrTuning) {
      options.tuningConfig = optionsOrTuning as EngineTuningConfig;
    }
    perturbations = legacyPerturbations;
  } else {
    perturbations = perturbationsOrIterations;
    if (optionsOrTuning) {
      if ('version' in optionsOrTuning) {
        options.tuningConfig = optionsOrTuning as EngineTuningConfig;
      } else {
        options = optionsOrTuning as SimulationOptions;
      }
    }
  }

  const iterations = options.iterations ?? 5000;
  const isShadowMode = Boolean(options.isShadowMode || (options.shadowConfig && options.shadowConfig.enabled));
  const activeExps = (isShadowMode && options.shadowConfig) ? options.shadowConfig.activeExperiments : {};
  const tuning = options.tuningConfig;

  const seedString = `${matchup.id}_${matchup.kickoffTime}_MARKOV_${iterations}_${tuning ? tuning.version : 'base'}_${isShadowMode ? 'SHADOW' : 'PROD'}_${JSON.stringify(perturbations)}_${JSON.stringify(activeExps)}`;
  const seed = options.seedOverride !== undefined ? options.seedOverride : hashStringToSeed(seedString);
  const prng = createMulberry32(seed);

  const home = matchup.homeTeam;
  const away = matchup.awayTeam;

  // Weather & Perturbation overrides
  let windMph = perturbations.forceDome 
    ? 0 
    : (perturbations.windMphOverride !== undefined ? perturbations.windMphOverride : matchup.weather.windMph);

  if (isShadowMode && activeExps['EXP_WEATHER_QUADRATIC_DRAG'] && windMph > 12) {
    windMph = windMph * 1.15;
  }

  // Trench modifications with perturbations
  let homePBWR = home.trench.passBlockWinRate;
  if (perturbations.homeCenterOut) homePBWR -= 14;
  if (perturbations.homeLTOut) homePBWR -= 8;

  let awayPRWR = away.trench.passRushWinRate;
  if (perturbations.awayDEOut) awayPRWR -= 7;

  let homeEDSR = home.earlyDownSuccessRate ?? 50.0;
  if (perturbations.homeQBOut) homeEDSR -= 5.5;

  let awayPBWR = away.trench.passBlockWinRate;
  let homePRWR = home.trench.passRushWinRate;
  let awayEDSR = away.earlyDownSuccessRate ?? 49.0;

  // Shadow mode parameter shifts
  if (isShadowMode) {
    if (activeExps['EXP_SIGMOIDAL_TRENCH']) {
      if (homePBWR < 58) homePBWR -= Math.pow((58 - homePBWR) / 10, 1.4) * 2.0;
      if (awayPBWR < 58) awayPBWR -= Math.pow((58 - awayPBWR) / 10, 1.4) * 2.0;
    }
    if (activeExps['EXP_EDSR_LEVERAGE_BOOST']) {
      const delta = (homeEDSR - awayEDSR) * 0.12;
      homeEDSR += delta;
      awayEDSR -= delta;
    }
  }

  // Base possessions per game (NFL ~11.4, CFB ~12.8)
  const baseDrives = matchup.league === 'CFB' ? 12.8 : 11.4;
  const paceMult = tuning?.scoringPaceMultiplier ?? 1.0;
  const targetDrives = Math.round(baseDrives * paceMult);

  let homeWins = 0;
  let homeCovers = 0;
  let blowouts = 0;
  let totalHomeScore = 0;
  let totalAwayScore = 0;

  // Drive Telemetry Accumulators
  let totalTDsHome = 0;
  let totalTDsAway = 0;
  let totalFGsHome = 0;
  let totalFGsAway = 0;
  let totalTurnoversHome = 0;
  let totalTurnoversAway = 0;
  let rzTripsHome = 0;
  let rzScoresHome = 0;
  let rzTripsAway = 0;
  let rzScoresAway = 0;

  const marginBuckets: { [margin: number]: number } = {};

  for (let i = 0; i < iterations; i++) {
    let gameHomeScore = 0;
    let gameAwayScore = 0;

    const drivesThisGame = targetDrives + (prng() < 0.35 ? 1 : (prng() < 0.35 ? -1 : 0));

    for (let d = 0; d < drivesThisGame; d++) {
      // Away Drive
      const awayStart = 25 + Math.round((prng() - 0.5) * 12);
      const awayOutcome = simulateMarkovDrive(
        awayPBWR,
        homePRWR,
        awayEDSR,
        awayStart,
        windMph,
        prng
      );
      gameAwayScore += awayOutcome.points;
      if (awayOutcome.type === 'TOUCHDOWN') totalTDsAway++;
      if (awayOutcome.type === 'FIELD_GOAL') totalFGsAway++;
      if (awayOutcome.type === 'TURNOVER' || awayOutcome.type === 'TURNOVER_DOWNS') totalTurnoversAway++;
      if (awayOutcome.reachedRedZone) {
        rzTripsAway++;
        if (awayOutcome.points > 0) rzScoresAway++;
      }

      // Home Drive (incorporates home field advantage on starting position or EDSR)
      const hfaBonus = (tuning?.homeFieldAdvantage ?? 2.2) > 0 ? 2 : 0;
      const homeStart = 26 + hfaBonus + Math.round((prng() - 0.5) * 12);
      const homeOutcome = simulateMarkovDrive(
        homePBWR,
        awayPRWR,
        homeEDSR + (hfaBonus > 0 ? 0.8 : 0),
        homeStart,
        windMph,
        prng
      );
      gameHomeScore += homeOutcome.points;
      if (homeOutcome.type === 'TOUCHDOWN') totalTDsHome++;
      if (homeOutcome.type === 'FIELD_GOAL') totalFGsHome++;
      if (homeOutcome.type === 'TURNOVER' || homeOutcome.type === 'TURNOVER_DOWNS') totalTurnoversHome++;
      if (homeOutcome.reachedRedZone) {
        rzTripsHome++;
        if (homeOutcome.points > 0) rzScoresHome++;
      }
    }

    totalHomeScore += gameHomeScore;
    totalAwayScore += gameAwayScore;

    const margin = gameHomeScore - gameAwayScore; // Positive = Home win
    if (margin > 0) homeWins++;
    if (margin > -matchup.market.spread) homeCovers++;
    if (Math.abs(margin) >= 14) blowouts++;

    const clampedMargin = Math.max(-30, Math.min(30, margin));
    marginBuckets[clampedMargin] = (marginBuckets[clampedMargin] || 0) + 1;
  }

  const projHome = Number((totalHomeScore / iterations).toFixed(1));
  const projAway = Number((totalAwayScore / iterations).toFixed(1));
  const simSpread = Number((projAway - projHome).toFixed(1));
  const simTotal = Number((projHome + projAway).toFixed(1));

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
    simulationEngine: 'MARKOV_DRIVE',
    projectedTouchdownsHome: Number((totalTDsHome / iterations).toFixed(1)),
    projectedTouchdownsAway: Number((totalTDsAway / iterations).toFixed(1)),
    projectedFieldGoalsHome: Number((totalFGsHome / iterations).toFixed(1)),
    projectedFieldGoalsAway: Number((totalFGsAway / iterations).toFixed(1)),
    redZoneEfficiencyHome: rzTripsHome > 0 ? Number(((rzScoresHome / rzTripsHome) * 100).toFixed(1)) : 68.0,
    redZoneEfficiencyAway: rzTripsAway > 0 ? Number(((rzScoresAway / rzTripsAway) * 100).toFixed(1)) : 64.0,
    turnoversExpectedHome: Number((totalTurnoversHome / iterations).toFixed(1)),
    turnoversExpectedAway: Number((totalTurnoversAway / iterations).toFixed(1)),
  };
}
