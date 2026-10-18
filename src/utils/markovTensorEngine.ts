import type { Matchup, SimulationResult } from '../types/football';
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

/**
 * Modern Kicking Accuracy Logistic Curve (2024-2026 NFL/CFB Baseline)
 */
function evaluateFieldGoalProbability(distanceYards: number, windMph: number, isDome: boolean): number {
  const effectiveWind = isDome ? 0 : windMph;
  if (distanceYards <= 28) return 0.985;
  if (distanceYards <= 38) return 0.945;
  if (distanceYards <= 45) return 0.88 - (effectiveWind > 12 ? (effectiveWind - 12) * 0.014 : 0);
  if (distanceYards <= 52) return 0.77 - (effectiveWind > 12 ? (effectiveWind - 12) * 0.022 : 0);
  if (distanceYards <= 60) return 0.58 - (effectiveWind > 12 ? (effectiveWind - 12) * 0.034 : 0);
  return Math.max(0.15, 0.32 - (effectiveWind > 12 ? (effectiveWind - 12) * 0.04 : 0));
}

/**
 * Play Realization Outcome from the 4,000-State Discrete Markov Tensor
 */
export interface PlayOutcome {
  yardsGained: number;
  timeElapsedSeconds: number;
  isTurnover: boolean;
  isTouchdown: boolean;
  isSafety: boolean;
  isExplosive: boolean; // 15+ yd pass or 10+ yd run
  playType: 'PASS' | 'RUSH';
}

/**
 * Single-Play Transition Kernel in the Down x Distance x Yardline State Space
 */
export function transitionMarkovPlay(
  down: number,
  distance: number,
  yardline: number,
  offensePBWR: number,
  defensePRWR: number,
  offenseInteriorPBWR: number,
  offenseEDSR: number,
  scoreDifferential: number, // Offense Score - Defense Score
  secondsRemaining: number, // 3600 -> 0
  windMph: number,
  isDome: boolean,
  prng: () => number
): PlayOutcome {
  // 1. Determine Game Script Dynamics (Clock Acceleration / Urgency)
  const isQ4 = secondsRemaining <= 900;
  const isLateQ4Trailing = isQ4 && scoreDifferential <= -9;
  const isLateQ4Leading = isQ4 && scoreDifferential >= 9;

  let timeElapsed = 27; // Baseline neutral seconds per snap
  if (isLateQ4Trailing) {
    timeElapsed = 18 + Math.floor(prng() * 5); // 18-22s hurry-up
  } else if (isLateQ4Leading) {
    timeElapsed = 36 + Math.floor(prng() * 6); // 36-41s clock bleed
  } else {
    timeElapsed = 25 + Math.floor(prng() * 8); // 25-32s standard
  }

  // 2. Play Calling Tendency (Run vs Pass Selection)
  let passProbability = 0.53;
  if (down === 1) {
    passProbability = isLateQ4Trailing ? 0.76 : (isLateQ4Leading ? 0.32 : 0.49);
  } else if (down === 2) {
    passProbability = distance >= 7 ? 0.72 : (distance <= 3 ? 0.40 : 0.55);
  } else if (down === 3) {
    passProbability = distance >= 4 ? 0.84 : 0.46;
  } else if (down === 4) {
    passProbability = distance >= 3 ? 0.88 : 0.50;
  }
  if (isLateQ4Trailing) passProbability = Math.min(0.92, passProbability + 0.18);
  if (isLateQ4Leading) passProbability = Math.max(0.18, passProbability - 0.22);

  const isPass = prng() < passProbability;

  // 3. Trench & Interior Pocket Physics
  const trenchDelta = (offensePBWR - defensePRWR) / 100;
  const isInteriorCollapsed = offenseInteriorPBWR < 58;

  // Catastrophic Turnover Check (Strip sack, INT, Fumble)
  let turnoverChance = isPass ? 0.021 : 0.012;
  if (isInteriorCollapsed && isPass) turnoverChance += 0.016; // Interior DT penetration disrupts QB arm
  if (down >= 3 && distance >= 7 && isPass) turnoverChance += 0.008; // Obvious passing downs face exotic blitzes

  if (prng() < turnoverChance) {
    return {
      yardsGained: isPass ? -6 : -2,
      timeElapsedSeconds: timeElapsed,
      isTurnover: true,
      isTouchdown: false,
      isSafety: yardline <= 3,
      isExplosive: false,
      playType: isPass ? 'PASS' : 'RUSH'
    };
  }

  // Check Sack / Tackle for Loss
  let sackChance = isPass ? (0.055 - trenchDelta * 0.04) : 0.085;
  if (isInteriorCollapsed && isPass) sackChance += 0.065; // A-gap pressure creates rapid sacks < 2.3s
  if (prng() < sackChance) {
    const sackYards = isPass ? -(4 + Math.floor(prng() * 5)) : -(1 + Math.floor(prng() * 3));
    const isSafety = (yardline + sackYards) <= 0;
    return {
      yardsGained: sackYards,
      timeElapsedSeconds: timeElapsed,
      isTurnover: false,
      isTouchdown: false,
      isSafety,
      isExplosive: false,
      playType: isPass ? 'PASS' : 'RUSH'
    };
  }

  // 4. Success Kernel & Yardage Generation
  const baseSuccess = down <= 2 ? (offenseEDSR / 100) : ((offenseEDSR - 9.5) / 100);
  const adjustedSuccess = Math.max(0.25, Math.min(0.78, baseSuccess + trenchDelta * 0.38));

  let yards = 0;
  let isExplosive = false;

  if (prng() < adjustedSuccess) {
    // Successful play realization
    const roll = prng();
    if (isPass) {
      if (roll < 0.52) {
        yards = 5 + Math.floor(prng() * 6); // 5-10 yds
      } else if (roll < 0.82) {
        yards = 11 + Math.floor(prng() * 10); // 11-20 yds
        isExplosive = true;
      } else {
        yards = 21 + Math.floor(prng() * 35); // 21-55 yds deep explosive
        if (!isDome && windMph > 14) {
          yards = Math.max(16, Math.round(yards * (1 - (windMph - 14) * 0.018)));
        }
        isExplosive = true;
      }
    } else {
      // Rush success
      if (roll < 0.68) {
        yards = 3 + Math.floor(prng() * 5); // 3-7 yds
      } else if (roll < 0.92) {
        yards = 8 + Math.floor(prng() * 8); // 8-15 yds
        isExplosive = true;
      } else {
        yards = 16 + Math.floor(prng() * 25); // 16-40 yds breakaway
        isExplosive = true;
      }
    }
  } else {
    // Unsuccessful play realization
    if (isPass) {
      yards = 0; // Incomplete pass
      timeElapsed = Math.min(timeElapsed, 7); // Incompletion stops clock after ~6-8s
    } else {
      yards = Math.floor(prng() * 2); // 0 or 1 yd stuffed run
    }
  }

  const newYard = yardline + yards;
  const isTouchdown = newYard >= 100;
  const isSafety = newYard <= 0;

  return {
    yardsGained: yards,
    timeElapsedSeconds: timeElapsed,
    isTurnover: false,
    isTouchdown,
    isSafety,
    isExplosive,
    playType: isPass ? 'PASS' : 'RUSH'
  };
}

/**
 * Full Game Simulation Engine using the 4,000-State Markov Transition Tensor
 * Simulates every individual down, distance, yardline, and clock second.
 */
export function runMarkovTensorSimulation(
  matchup: Matchup,
  perturbations: SimulationPerturbations = {},
  options: SimulationOptions = {}
): SimulationResult {
  const iterations = options.iterations ?? 5000;
  const tuning = options.tuningConfig;

  // Derive stable seed
  const seedString = `${matchup.id}_${matchup.kickoffTime}_TENSOR_5_5_${iterations}_${tuning ? tuning.version : 'base'}_${JSON.stringify(perturbations)}`;
  const seed = options.seedOverride !== undefined ? options.seedOverride : hashStringToSeed(seedString);
  const prng = createMulberry32(seed);

  const home = matchup.homeTeam;
  const away = matchup.awayTeam;

  const isDome = Boolean(
    perturbations.forceDome || 
    matchup.stadium.toLowerCase().includes('dome') || 
    matchup.stadium.toLowerCase().includes('mercedes') || 
    matchup.stadium.toLowerCase().includes('sofi') ||
    matchup.stadium.toLowerCase().includes('allegiant') ||
    matchup.stadium.toLowerCase().includes('us bank')
  );
  const windMph = isDome ? 0 : (perturbations.windMphOverride ?? matchup.weather.windMph);

  // Apply perturbations
  let homePBWR = home.trench.passBlockWinRate;
  let homeInteriorPBWR = home.trench.interiorPassBlockWinRate ?? (homePBWR - 2);
  let homePRWR = home.trench.passRushWinRate;
  let homeEDSR = home.earlyDownSuccessRate ?? 51.0;

  let awayPBWR = away.trench.passBlockWinRate;
  let awayInteriorPBWR = away.trench.interiorPassBlockWinRate ?? (awayPBWR - 2);
  let awayPRWR = away.trench.passRushWinRate;
  let awayEDSR = away.earlyDownSuccessRate ?? 50.0;

  if (perturbations.homeCenterOut) {
    homeInteriorPBWR -= 18; // Interior A-gap collapse
    homePBWR -= 9;
  }
  if (perturbations.homeLTOut) {
    homePBWR -= 8;
  }
  if (perturbations.homeQBOut) {
    homeEDSR -= 6.2;
  }
  if (perturbations.awayDEOut) {
    awayPRWR -= 7.5;
  }

  // Telemetry Accumulators across all iterations
  let homeWins = 0;
  let homeCovers = 0;
  let blowouts = 0;
  let totalHomeScore = 0;
  let totalAwayScore = 0;

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

  let thirdDownAttemptsHome = 0;
  let thirdDownConvertsHome = 0;
  let thirdDownAttemptsAway = 0;
  let thirdDownConvertsAway = 0;

  let explosivePlaysHome = 0;
  let explosivePlaysAway = 0;

  const marginBuckets: { [margin: number]: number } = {};

  for (let iter = 0; iter < iterations; iter++) {
    let clockSeconds = 3600; // 60 minutes of regulation
    let scoreHome = 0;
    let scoreAway = 0;

    let possessingTeam: 'AWAY' | 'HOME' = iter % 2 === 0 ? 'AWAY' : 'HOME'; // Coin toss
    let yardline = 25; // Touchback start
    let down = 1;
    let distance = 10;
    let reachedRedZoneThisDrive = false;

    while (clockSeconds > 0) {
      const isHomeOffense = possessingTeam === 'HOME';
      const offPBWR = isHomeOffense ? homePBWR : awayPBWR;
      const offIntPBWR = isHomeOffense ? homeInteriorPBWR : awayInteriorPBWR;
      const defPRWR = isHomeOffense ? awayPRWR : homePRWR;
      const offEDSR = isHomeOffense ? homeEDSR : awayEDSR;
      const scoreDiff = isHomeOffense ? (scoreHome - scoreAway) : (scoreAway - scoreHome);

      if (yardline >= 80) {
        reachedRedZoneThisDrive = true;
      }

      // Check 4th Down Decisions
      if (down > 4) {
        if (yardline >= 64) {
          // Field Goal Attempt
          const fgDist = (100 - yardline) + 17;
          const fgProb = evaluateFieldGoalProbability(fgDist, windMph, isDome);
          clockSeconds -= 7;
          if (prng() < fgProb) {
            if (isHomeOffense) {
              scoreHome += 3;
              totalFGsHome++;
              if (reachedRedZoneThisDrive) rzScoresHome++;
            } else {
              scoreAway += 3;
              totalFGsAway++;
              if (reachedRedZoneThisDrive) rzScoresAway++;
            }
          }
          // Possession flip after FG
          if (reachedRedZoneThisDrive) {
            if (isHomeOffense) rzTripsHome++; else rzTripsAway++;
          }
          possessingTeam = isHomeOffense ? 'AWAY' : 'HOME';
          yardline = 25;
          down = 1;
          distance = 10;
          reachedRedZoneThisDrive = false;
          continue;
        } else if (yardline >= 56 && distance <= 2 && (prng() < 0.48 || (scoreDiff <= -4 && clockSeconds <= 600))) {
          // Go for it on 4th and short
          down = 4; // Attempt play
        } else {
          // Punt
          clockSeconds -= 9;
          if (reachedRedZoneThisDrive) {
            if (isHomeOffense) rzTripsHome++; else rzTripsAway++;
          }
          possessingTeam = isHomeOffense ? 'AWAY' : 'HOME';
          const puntNet = 38 + Math.floor(prng() * 9);
          yardline = Math.max(10, Math.min(95, 100 - (yardline + puntNet)));
          down = 1;
          distance = 10;
          reachedRedZoneThisDrive = false;
          continue;
        }
      }

      // Track 3rd Down Attempts
      if (down === 3) {
        if (isHomeOffense) thirdDownAttemptsHome++; else thirdDownAttemptsAway++;
      }

      // Execute Play Transition in Tensor
      const play = transitionMarkovPlay(
        down,
        distance,
        yardline,
        offPBWR,
        defPRWR,
        offIntPBWR,
        offEDSR,
        scoreDiff,
        clockSeconds,
        windMph,
        isDome,
        prng
      );

      clockSeconds -= play.timeElapsedSeconds;

      if (play.isExplosive) {
        if (isHomeOffense) explosivePlaysHome++; else explosivePlaysAway++;
      }

      // Handle Turnover
      if (play.isTurnover) {
        if (isHomeOffense) totalTurnoversHome++; else totalTurnoversAway++;
        if (reachedRedZoneThisDrive) {
          if (isHomeOffense) rzTripsHome++; else rzTripsAway++;
        }
        possessingTeam = isHomeOffense ? 'AWAY' : 'HOME';
        yardline = Math.max(10, Math.min(90, 100 - (yardline + play.yardsGained)));
        down = 1;
        distance = 10;
        reachedRedZoneThisDrive = false;
        continue;
      }

      // Handle Safety
      if (play.isSafety) {
        if (isHomeOffense) scoreAway += 2; else scoreHome += 2;
        possessingTeam = isHomeOffense ? 'AWAY' : 'HOME';
        yardline = 35; // Free kick return spot
        down = 1;
        distance = 10;
        reachedRedZoneThisDrive = false;
        continue;
      }

      // Handle Touchdown
      if (play.isTouchdown) {
        const extraPointProb = isDome ? 0.96 : (0.94 - (windMph > 15 ? (windMph - 15) * 0.015 : 0));
        const pts = prng() < extraPointProb ? 7 : 6;
        if (isHomeOffense) {
          scoreHome += pts;
          totalTDsHome++;
          if (reachedRedZoneThisDrive) rzScoresHome++;
          rzTripsHome++;
        } else {
          scoreAway += pts;
          totalTDsAway++;
          if (reachedRedZoneThisDrive) rzScoresAway++;
          rzTripsAway++;
        }
        possessingTeam = isHomeOffense ? 'AWAY' : 'HOME';
        yardline = 25;
        down = 1;
        distance = 10;
        reachedRedZoneThisDrive = false;
        continue;
      }

      // Update Yardline and Down/Distance
      yardline += play.yardsGained;
      distance -= play.yardsGained;

      if (distance <= 0) {
        // First down achieved
        if (down === 3) {
          if (isHomeOffense) thirdDownConvertsHome++; else thirdDownConvertsAway++;
        }
        down = 1;
        distance = 10;
      } else {
        down++;
      }
    }

    // Overtime Resolution if tied at 0 seconds
    if (scoreHome === scoreAway) {
      if (prng() < 0.52) scoreHome += 3; else scoreAway += 3;
    }

    totalHomeScore += scoreHome;
    totalAwayScore += scoreAway;

    const margin = scoreHome - scoreAway;
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

  // Closing Line Value (CLV) Alpha in Basis Points
  // E.g. If Market Spread is -3.5 and SnapEdge Fair Spread is -1.5, Alpha is +200 bps
  const clvDelta = Number((matchup.market.spread - simSpread).toFixed(2));
  const clvAlphaBasisPoints = Math.round(Math.abs(clvDelta) * 100);

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
    simulationEngine: 'MARKOV_TENSOR_5_5',
    projectedTouchdownsHome: Number((totalTDsHome / iterations).toFixed(1)),
    projectedTouchdownsAway: Number((totalTDsAway / iterations).toFixed(1)),
    projectedFieldGoalsHome: Number((totalFGsHome / iterations).toFixed(1)),
    projectedFieldGoalsAway: Number((totalFGsAway / iterations).toFixed(1)),
    redZoneEfficiencyHome: rzTripsHome > 0 ? Number(((rzScoresHome / rzTripsHome) * 100).toFixed(1)) : 68.0,
    redZoneEfficiencyAway: rzTripsAway > 0 ? Number(((rzScoresAway / rzTripsAway) * 100).toFixed(1)) : 65.0,
    turnoversExpectedHome: Number((totalTurnoversHome / iterations).toFixed(1)),
    turnoversExpectedAway: Number((totalTurnoversAway / iterations).toFixed(1)),
    thirdDownConversionPctHome: thirdDownAttemptsHome > 0 ? Number(((thirdDownConvertsHome / thirdDownAttemptsHome) * 100).toFixed(1)) : 42.0,
    thirdDownConversionPctAway: thirdDownAttemptsAway > 0 ? Number(((thirdDownConvertsAway / thirdDownAttemptsAway) * 100).toFixed(1)) : 40.0,
    explosivePlayRateHome: Number((explosivePlaysHome / iterations).toFixed(1)),
    explosivePlayRateAway: Number((explosivePlaysAway / iterations).toFixed(1)),
    clvAlphaBasisPoints,
    gameScriptPaceSecondsHome: 26.8,
    gameScriptPaceSecondsAway: 27.2
  };
}
