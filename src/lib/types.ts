export interface Team {
  id: string;
  name: string;
  short_name: string;
  color: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed';
export type MatchStage = 'league' | 'qualifier' | 'eliminator' | 'final';

export interface Match {
  id: string;
  match_number: number;
  team1: string;
  team2: string;
  venue: string;
  match_date: string; // ISO 8601 string (stored as TIMESTAMPTZ in DB)
  status: MatchStatus;
  winner: string | null;
  stage: MatchStage;
  created_at: string;
}

// Helper to get display time from match_date
export function getMatchTimeIST(matchDate: string): string {
  const d = new Date(matchDate);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export interface Pick {
  id: string;
  user_id: string;
  match_id: string;
  picked_team: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  correct_picks: number;
  wrong_picks: number;
  missed_picks: number;
  total_points: number;
  rank: number;
}