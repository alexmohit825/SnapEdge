import type { Matchup, SanityViolation, SanityAuditResult, PlayerStatus } from '../types/football';

/**
 * SnapEdge Comprehensive Sanity Guardrails Engine
 * Strictly enforces physical, temporal, and mathematical boundaries across all features:
 * - Dates (ISO compliance, season window 2024-2028, no epoch 1970 fallbacks)
 * - Scores (Non-negative integers, realistic 0-99 bounds, final game completeness)
 * - Injuries & Personnel (Valid positions, recognized statuses, non-negative ratings)
 * - Trench Physics (Win rates bounded 20-95%, time to throw 1.8s - 4.5s)
 * - Environmental Weather (Realistic temperatures, wind limits, dome atmospheric guarantees)
 * - Market & Model Bounds (Spreads -70 to +70, totals 15 to 120, probabilities 1% to 99%)
 */

const VALID_POSITIONS = new Set([
  'QB', 'LT', 'RT', 'C', 'OG', 'OT', 'DE', 'DT', 'EDGE', 'CB1', 'CB', 'WR1', 'WR', 'RB', 'TE', 'S', 'K', 'P'
]);

const VALID_INJURY_STATUSES = new Set(['ACTIVE', 'QUESTIONABLE', 'DOUBTFUL', 'OUT', 'IR']);

export function sanitizeDate(dateStr: string | undefined, defaultDateStr: string = '2026-10-10T17:00:00Z'): { sanitized: string; violation?: SanityViolation } {
  if (!dateStr || typeof dateStr !== 'string') {
    return {
      sanitized: defaultDateStr,
      violation: {
        field: 'kickoffTime',
        rule: 'Date must be a non-empty string',
        receivedValue: dateStr,
        actionTaken: 'FALLBACK',
        sanitizedValue: defaultDateStr,
        severity: 'CRITICAL'
      }
    };
  }

  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) {
    return {
      sanitized: defaultDateStr,
      violation: {
        field: 'kickoffTime',
        rule: 'Date must be valid ISO timestamp',
        receivedValue: dateStr,
        actionTaken: 'FALLBACK',
        sanitizedValue: defaultDateStr,
        severity: 'CRITICAL'
      }
    };
  }

  const year = new Date(parsed).getUTCFullYear();
  if (year < 2024 || year > 2028) {
    return {
      sanitized: defaultDateStr,
      violation: {
        field: 'kickoffTime',
        rule: 'Date year must fall within season calendar (2024-2028)',
        receivedValue: dateStr,
        actionTaken: 'FALLBACK',
        sanitizedValue: defaultDateStr,
        severity: 'CRITICAL'
      }
    };
  }

  return { sanitized: new Date(parsed).toISOString() };
}

export function sanitizeScore(score: any, fieldName: string): { sanitized: number; violation?: SanityViolation } {
  const num = typeof score === 'number' ? score : parseInt(score, 10);
  if (isNaN(num) || num < 0) {
    return {
      sanitized: 0,
      violation: {
        field: fieldName,
        rule: 'Score must be non-negative integer',
        receivedValue: score,
        actionTaken: 'CLAMPED',
        sanitizedValue: 0,
        severity: 'WARNING'
      }
    };
  }

  if (num > 99) {
    return {
      sanitized: 99,
      violation: {
        field: fieldName,
        rule: 'Score must not exceed modern football cap (99 pts)',
        receivedValue: score,
        actionTaken: 'CLAMPED',
        sanitizedValue: 99,
        severity: 'WARNING'
      }
    };
  }

  return { sanitized: Math.round(num) };
}

export function sanitizeNumber(
  val: any, 
  min: number, 
  max: number, 
  fallback: number, 
  fieldName: string, 
  rule: string,
  isRequired: boolean = false
): { sanitized: number; violation?: SanityViolation } {
  if (val === undefined || val === null) {
    if (!isRequired) {
      return { sanitized: fallback };
    }
    return {
      sanitized: fallback,
      violation: {
        field: fieldName,
        rule: `${fieldName} is required`,
        receivedValue: val,
        actionTaken: 'FALLBACK',
        sanitizedValue: fallback,
        severity: 'WARNING'
      }
    };
  }

  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) {
    return {
      sanitized: fallback,
      violation: {
        field: fieldName,
        rule,
        receivedValue: val,
        actionTaken: 'FALLBACK',
        sanitizedValue: fallback,
        severity: 'WARNING'
      }
    };
  }

  if (num < min) {
    return {
      sanitized: min,
      violation: {
        field: fieldName,
        rule,
        receivedValue: val,
        actionTaken: 'CLAMPED',
        sanitizedValue: min,
        severity: 'WARNING'
      }
    };
  }

  if (num > max) {
    return {
      sanitized: max,
      violation: {
        field: fieldName,
        rule,
        receivedValue: val,
        actionTaken: 'CLAMPED',
        sanitizedValue: max,
        severity: 'WARNING'
      }
    };
  }

  return { sanitized: num };
}

export function sanitizePersonnel(player: any, idx: number, teamSide: 'home' | 'away'): { sanitized: PlayerStatus; violations: SanityViolation[] } {
  const violations: SanityViolation[] = [];

  const rawPos = String(player?.position || 'QB').toUpperCase();
  const position = VALID_POSITIONS.has(rawPos) ? (rawPos as any) : 'QB';
  if (position !== rawPos) {
    violations.push({
      field: `${teamSide}Team.keyPersonnel[${idx}].position`,
      rule: 'Player position must be valid football role',
      receivedValue: player?.position,
      actionTaken: 'FALLBACK',
      sanitizedValue: position,
      severity: 'WARNING'
    });
  }

  const rawStatus = String(player?.status || 'ACTIVE').toUpperCase();
  const status = VALID_INJURY_STATUSES.has(rawStatus) ? (rawStatus as any) : 'ACTIVE';
  if (status !== rawStatus) {
    violations.push({
      field: `${teamSide}Team.keyPersonnel[${idx}].status`,
      rule: 'Injury status must be ACTIVE, QUESTIONABLE, DOUBTFUL, OUT, or IR',
      receivedValue: player?.status,
      actionTaken: 'FALLBACK',
      sanitizedValue: status,
      severity: 'WARNING'
    });
  }

  const name = (player?.name && typeof player.name === 'string' && player.name.trim().length > 0)
    ? player.name.trim()
    : `${position} Starter`;

  const ratingRes = sanitizeNumber(player?.tierRating, 0, 100, 75, `${teamSide}Team.keyPersonnel[${idx}].tierRating`, 'Tier rating must be 0-100');
  if (ratingRes.violation) violations.push(ratingRes.violation);

  return {
    sanitized: {
      id: player?.id || `${teamSide}_player_${idx}`,
      name,
      position,
      status,
      tierRating: ratingRes.sanitized,
      isKeyPlayer: Boolean(player?.isKeyPlayer ?? true)
    },
    violations
  };
}

/**
 * Audit and sanitize a full Matchup payload
 */
export function auditAndSanitizeMatchup(raw: Matchup): { sanitized: Matchup; audit: SanityAuditResult } {
  const violations: SanityViolation[] = [];

  // 1. Sanitize Date
  const dateCheck = sanitizeDate(raw.kickoffTime);
  if (dateCheck.violation) violations.push(dateCheck.violation);

  // 2. Sanitize Weather
  const isDome = Boolean(raw.isDome);
  let tempF = raw.weather?.tempF ?? 70;
  let windMph = raw.weather?.windMph ?? 5;
  let precip = raw.weather?.precipitationPct ?? 0;

  if (isDome) {
    if (windMph !== 0 || precip !== 0) {
      violations.push({
        field: 'weather.windMph/precip',
        rule: 'Dome stadiums enforce 0 MPH wind and 0% precipitation',
        receivedValue: { windMph, precip },
        actionTaken: 'CLAMPED',
        sanitizedValue: { windMph: 0, precip: 0, tempF: 72 },
        severity: 'WARNING'
      });
    }
    windMph = 0;
    precip = 0;
    tempF = 72;
  } else {
    const tempCheck = sanitizeNumber(tempF, -20, 120, 68, 'weather.tempF', 'Temperature must be between -20F and 120F');
    if (tempCheck.violation) violations.push(tempCheck.violation);
    tempF = tempCheck.sanitized;

    const windCheck = sanitizeNumber(windMph, 0, 75, 5, 'weather.windMph', 'Wind must be between 0 and 75 MPH');
    if (windCheck.violation) violations.push(windCheck.violation);
    windMph = windCheck.sanitized;

    const precipCheck = sanitizeNumber(precip, 0, 100, 0, 'weather.precipitationPct', 'Precipitation must be 0-100%');
    if (precipCheck.violation) violations.push(precipCheck.violation);
    precip = precipCheck.sanitized;
  }

  // 3. Sanitize Actual Scores if present
  let actualScore = raw.actualScore;
  if (actualScore) {
    const homeScoreCheck = sanitizeScore(actualScore.home, 'actualScore.home');
    if (homeScoreCheck.violation) violations.push(homeScoreCheck.violation);

    const awayScoreCheck = sanitizeScore(actualScore.away, 'actualScore.away');
    if (awayScoreCheck.violation) violations.push(awayScoreCheck.violation);

    actualScore = {
      home: homeScoreCheck.sanitized,
      away: awayScoreCheck.sanitized
    };
  }

  // 4. Sanitize Market Odds
  const spreadCheck = sanitizeNumber(raw.market?.spread, -70, 70, -3.0, 'market.spread', 'Spread must be between -70 and +70');
  if (spreadCheck.violation) violations.push(spreadCheck.violation);

  const totalCheck = sanitizeNumber(raw.market?.total, 15, 120, 48.0, 'market.total', 'Over/Under total must be between 15 and 120');
  if (totalCheck.violation) violations.push(totalCheck.violation);

  // 5. Sanitize Trench Metrics (Home & Away)
  const sanitizeTrench = (trench: any, side: 'home' | 'away') => {
    const pbwr = sanitizeNumber(trench?.passBlockWinRate, 20, 95, 65, `${side}Team.trench.pbwr`, 'PBWR must be 20-95%');
    if (pbwr.violation) violations.push(pbwr.violation);

    const prwr = sanitizeNumber(trench?.passRushWinRate, 20, 95, 52, `${side}Team.trench.prwr`, 'PRWR must be 20-95%');
    if (prwr.violation) violations.push(prwr.violation);

    const intPbwr = sanitizeNumber(trench?.interiorPassBlockWinRate, 20, 95, pbwr.sanitized - 2, `${side}Team.trench.interiorPbwr`, 'Interior PBWR must be 20-95%');
    if (intPbwr.violation) violations.push(intPbwr.violation);

    const intPrwr = sanitizeNumber(trench?.interiorPassRushWinRate, 20, 95, prwr.sanitized + 2, `${side}Team.trench.interiorPrwr`, 'Interior PRWR must be 20-95%');
    if (intPrwr.violation) violations.push(intPrwr.violation);

    const ttt = sanitizeNumber(trench?.avgTimeToThrowSec, 1.8, 4.5, 2.65, `${side}Team.trench.ttt`, 'Time to throw must be 1.8s - 4.5s');
    if (ttt.violation) violations.push(ttt.violation);

    const stuff = sanitizeNumber(trench?.runStuffRate, 5, 55, 22, `${side}Team.trench.runStuff`, 'Run stuff rate must be 5-55%');
    if (stuff.violation) violations.push(stuff.violation);

    const injuries = sanitizeNumber(trench?.injuriesOnLine, 0, 5, 0, `${side}Team.trench.injuries`, 'Injuries on line must be 0-5');
    if (injuries.violation) violations.push(injuries.violation);

    return {
      passBlockWinRate: pbwr.sanitized,
      passRushWinRate: prwr.sanitized,
      interiorPassBlockWinRate: intPbwr.sanitized,
      interiorPassRushWinRate: intPrwr.sanitized,
      avgTimeToThrowSec: Number(ttt.sanitized.toFixed(2)),
      runStuffRate: stuff.sanitized,
      injuriesOnLine: Math.round(injuries.sanitized)
    };
  };

  const homeTrench = sanitizeTrench(raw.homeTeam?.trench, 'home');
  const awayTrench = sanitizeTrench(raw.awayTeam?.trench, 'away');

  // 6. Sanitize Scientific Variables (EDSR, Special Teams EPA)
  const homeEdsrCheck = sanitizeNumber(raw.homeTeam?.earlyDownSuccessRate, 30, 75, 51.5, 'homeTeam.earlyDownSuccessRate', 'EDSR must be 30-75%');
  if (homeEdsrCheck.violation) violations.push(homeEdsrCheck.violation);

  const awayEdsrCheck = sanitizeNumber(raw.awayTeam?.earlyDownSuccessRate, 30, 75, 48.8, 'awayTeam.earlyDownSuccessRate', 'EDSR must be 30-75%');
  if (awayEdsrCheck.violation) violations.push(awayEdsrCheck.violation);

  // 7. Sanitize Key Personnel
  const homePersonnel: PlayerStatus[] = [];
  (raw.homeTeam?.keyPersonnel || []).forEach((p, idx) => {
    const res = sanitizePersonnel(p, idx, 'home');
    violations.push(...res.violations);
    homePersonnel.push(res.sanitized);
  });

  const awayPersonnel: PlayerStatus[] = [];
  (raw.awayTeam?.keyPersonnel || []).forEach((p, idx) => {
    const res = sanitizePersonnel(p, idx, 'away');
    violations.push(...res.violations);
    awayPersonnel.push(res.sanitized);
  });

  // 8. Sanitize Model Probabilities
  let homeWinPct = sanitizeNumber(raw.model?.homeWinPct, 1.0, 99.0, 50.0, 'model.homeWinPct', 'Win probability must be 1.0-99.0%').sanitized;
  homeWinPct = Number(homeWinPct.toFixed(1));
  const awayWinPct = Number((100.0 - homeWinPct).toFixed(1));

  const fairSpreadCheck = sanitizeNumber(raw.model?.fairSpread, -70, 70, spreadCheck.sanitized, 'model.fairSpread', 'Fair spread must be between -70 and +70');
  if (fairSpreadCheck.violation) violations.push(fairSpreadCheck.violation);

  const divergence = Number((spreadCheck.sanitized - fairSpreadCheck.sanitized).toFixed(1));

  const sanitized: Matchup = {
    ...raw,
    kickoffTime: dateCheck.sanitized,
    isDome,
    actualScore,
    weather: {
      tempF: Math.round(tempF),
      windMph: Math.round(windMph),
      precipitationPct: Math.round(precip),
      description: raw.weather?.description || (isDome ? 'Controlled Dome Climate' : 'Game Day Forecast')
    },
    homeTeam: {
      ...raw.homeTeam,
      earlyDownSuccessRate: homeEdsrCheck.sanitized,
      specialTeamsEpa: sanitizeNumber(raw.homeTeam?.specialTeamsEpa, -1.0, 1.0, 0.05, 'homeTeam.specialTeamsEpa', 'Special teams EPA bounded -1 to +1').sanitized,
      trench: homeTrench,
      keyPersonnel: homePersonnel
    },
    awayTeam: {
      ...raw.awayTeam,
      earlyDownSuccessRate: awayEdsrCheck.sanitized,
      specialTeamsEpa: sanitizeNumber(raw.awayTeam?.specialTeamsEpa, -1.0, 1.0, -0.05, 'awayTeam.specialTeamsEpa', 'Special teams EPA bounded -1 to +1').sanitized,
      trench: awayTrench,
      keyPersonnel: awayPersonnel
    },
    market: {
      ...raw.market,
      spread: spreadCheck.sanitized,
      total: totalCheck.sanitized,
      publicCashPctHome: sanitizeNumber(raw.market?.publicCashPctHome, 0, 100, 50, 'market.publicCashPctHome', 'Cash % must be 0-100%').sanitized
    },
    model: {
      ...raw.model,
      fairSpread: fairSpreadCheck.sanitized,
      fairTotal: totalCheck.sanitized,
      homeWinPct,
      awayWinPct,
      divergencePoints: divergence,
      edgeConfidenceGrade: Math.abs(divergence) >= 2.5 ? 'A+' : Math.abs(divergence) >= 1.5 ? 'A' : 'B'
    }
  };

  return {
    sanitized,
    audit: {
      isValid: violations.length === 0,
      violationsCount: violations.length,
      violations,
      matchupId: raw.id
    }
  };
}

/**
 * Batch audit and sanitize an entire slate of matchups
 */
export function auditSlateSanity(slate: Matchup[]): {
  sanitizedSlate: Matchup[];
  totalViolations: number;
  violationSummary: Record<string, number>;
} {
  const sanitizedSlate: Matchup[] = [];
  let totalViolations = 0;
  const violationSummary: Record<string, number> = {};

  for (const m of slate) {
    const { sanitized, audit } = auditAndSanitizeMatchup(m);
    sanitizedSlate.push(sanitized);
    totalViolations += audit.violationsCount;

    for (const v of audit.violations) {
      violationSummary[v.field] = (violationSummary[v.field] || 0) + 1;
    }
  }

  return {
    sanitizedSlate,
    totalViolations,
    violationSummary
  };
}
