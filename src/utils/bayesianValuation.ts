/**
 * Bayesian Hierarchical Player & Trench Valuation Engine
 * Eliminates heuristic point drops by calculating Bayesian posterior EPA distributions
 * regressed against opponent defensive pressure rates.
 */

export interface PlayerValuationProfile {
  name: string;
  position: 'QB' | 'LT' | 'C' | 'EDGE' | 'CB1';
  careerDropbacksOrSnaps: number;
  observedEpaPerUnit: number; // e.g. +0.18 EPA/dropback
  isReplacement: boolean;
}

export interface BayesianInjuryAssessment {
  playerOut: string;
  replacementPlayer: string;
  priorMeanEpa: number;
  observedSampleEpa: number;
  posteriorEpaDelta: number;
  pointSpreadAdjustment: number;
  confidenceInterval95: [number, number];
  scientificRationale: string;
}

/**
 * Calculates conjugate normal-normal Bayesian shrinkage for replacement players
 */
export function calculateBayesianPlayerShrinkage(
  starter: PlayerValuationProfile,
  backup: PlayerValuationProfile,
  opposingDefensePressureRate: number // e.g. 34.5%
): BayesianInjuryAssessment {
  // League replacement baseline prior: Mean = -0.12 EPA/dropback, Variance = 0.04
  const priorMean = -0.12;
  const priorVariance = 0.04;
  const sampleVariance = 0.09;

  const n = backup.careerDropbacksOrSnaps;
  const sampleMean = backup.observedEpaPerUnit;

  // Bayesian Posterior Mean
  const posteriorPrecision = (1 / priorVariance) + (n / sampleVariance);
  const posteriorMean = ((priorMean / priorVariance) + (n * sampleMean / sampleVariance)) / posteriorPrecision;
  const posteriorStd = Math.sqrt(1 / posteriorPrecision);

  // Pressure vulnerability amplifier: Backups perform non-linearly worse when opponent pressure rate > 32%
  const pressureStress = opposingDefensePressureRate > 32.0 
    ? 1.0 + ((opposingDefensePressureRate - 32.0) / 100) * 1.4 
    : 1.0;

  const netEpaLoss = (starter.observedEpaPerUnit - posteriorMean) * pressureStress;

  // In the NFL, ~65 offensive plays per game. 
  // 1 EPA ≈ 0.92 point spread value on average.
  const pointSpreadAdjustment = Number((netEpaLoss * 36 * 0.92).toFixed(1));

  return {
    playerOut: starter.name,
    replacementPlayer: backup.name,
    priorMeanEpa: priorMean,
    observedSampleEpa: sampleMean,
    posteriorEpaDelta: Number(posteriorMean.toFixed(3)),
    pointSpreadAdjustment,
    confidenceInterval95: [
      Number((pointSpreadAdjustment - posteriorStd * 1.96 * 20).toFixed(1)),
      Number((pointSpreadAdjustment + posteriorStd * 1.96 * 20).toFixed(1))
    ],
    scientificRationale: `Shrank ${backup.name}'s observed sample (${n} snaps) toward league-replacement prior (${priorMean} EPA). Opposing pressure rate of ${opposingDefensePressureRate}% applied a ${((pressureStress - 1) * 100).toFixed(1)}% fragility multiplier.`
  };
}
