export type League = 'CFB' | 'NFL';

export interface PlayerStatus {
  id: string;
  name: string;
  position: 'QB' | 'LT' | 'RT' | 'C' | 'EDGE' | 'DT' | 'CB1' | 'WR1' | 'RB';
  tierRating: number; // 0 - 100
  status: 'ACTIVE' | 'QUESTIONABLE' | 'OUT';
  isKeyPlayer: boolean;
}

export interface TrenchUnit {
  passBlockWinRate: number; // Overall PBWR e.g. 68%
  passRushWinRate: number;  // Overall PRWR e.g. 52%
  interiorPassBlockWinRate?: number; // C/OG A-Gap PBWR e.g. 64%
  interiorPassRushWinRate?: number;  // DT/NT Interior Pressure e.g. 58%
  avgTimeToThrowSec: number; // e.g. 2.65
  runStuffRate: number;      // e.g. 21%
  injuriesOnLine: number;
}

export interface TeamProfile {
  id: string;
  name: string;
  mascot: string;
  abbreviation: string;
  record: string;
  conference: string;
  rank?: number;
  logoColor: string;
  blueChipRatio?: number; // 0 - 100 (CFB specific)
  returningProductionPct?: number; // 0 - 100 (CFB specific)
  adjOffEpa: number; // Opponent-adjusted EPA/play
  adjDefEpa: number;
  earlyDownSuccessRate?: number; // EDSR (1st & 2nd down success rate % e.g. 52.4)
  turnoverLuckDelta?: number; // Stochastic fumble/int bounce regression points
  specialTeamsEpa?: number; // Hidden starting field position EPA
  trench: TrenchUnit;
  keyPersonnel: PlayerStatus[];
}

export interface EdgeReceiptFactor {
  id: string;
  category: 'TRENCH' | 'PERSONNEL' | 'WEATHER' | 'REST' | 'RECRUITING' | 'REGRESSION' | 'SPECIAL_TEAMS' | 'TURNOVER_LUCK';
  description: string;
  impactPoints: number; // + or - relative to home team
  direction: 'HOME_FAVORED' | 'AWAY_FAVORED';
}

export interface Matchup {
  id: string;
  league: League;
  week: number;
  kickoffTime: string; // ISO string
  stadium: string;
  location: string;
  isDome: boolean;
  surface: 'Natural Grass' | 'FieldTurf' | 'Hybrid';
  
  // Weather metrics
  weather: {
    tempF: number;
    windMph: number;
    precipitationPct: number;
    description: string;
  };

  // Game Status & Actual Scores (for completed games)
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  actualScore?: {
    home: number;
    away: number;
  };
  
  // Teams
  homeTeam: TeamProfile;
  awayTeam: TeamProfile;
  
  // Market Odds
  market: {
    spread: number; // e.g. -3.5 (negative = home favored)
    total: number;  // e.g. 51.5
    moneylineHome: number;
    moneylineAway: number;
    publicCashPctHome: number; // 0-100
  };
  
  // SnapEdge Pre-Calculated Baseline
  model: {
    fairSpread: number;
    fairTotal: number;
    homeWinPct: number;
    awayWinPct: number;
    divergencePoints: number; // Positive means edge on home, negative on away
    edgeConfidenceGrade: 'A+' | 'A' | 'B+' | 'B' | 'NEUTRAL';
  };
  
  // The Explainable Receipts
  receipts: EdgeReceiptFactor[];
}

export interface SimulationResult {
  simulatedSpread: number;
  simulatedTotal: number;
  homeWinPct: number;
  awayWinPct: number;
  blowoutRiskPct: number; // Probability of 14+ pt win
  coverSpreadPct: number; // Probability of covering market spread
  projectedScoreHome: number;
  projectedScoreAway: number;
  distributionScores: { margin: number; count: number }[];
}
