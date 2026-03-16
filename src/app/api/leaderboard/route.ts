import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMatchPoints } from '@/lib/scoring';
import type { LeaderboardEntry, Match, MatchStage } from '@/lib/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed matches
    const { data: completedMatches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed');

    if (matchError) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    if (!completedMatches || completedMatches.length === 0) {
      // No completed matches yet — return all users with 0 points
      const { data: profiles } = await supabase.from('profiles').select('*');
      const leaderboard: LeaderboardEntry[] = (profiles || []).map((p) => ({
        user_id: p.id,
        display_name: p.display_name,
        correct_picks: 0,
        wrong_picks: 0,
        missed_picks: 0,
        total_points: 0,
        rank: 1,
      }));
      return NextResponse.json({ leaderboard });
    }

    const matchIds = completedMatches.map((m) => m.id);

    // Get all picks for completed matches
    const { data: allPicks, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .in('match_id', matchIds);

    if (picksError) {
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError || !profiles) {
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Build match lookup
    const matchMap = new Map<string, Match>();
    for (const m of completedMatches) {
      matchMap.set(m.id, m as Match);
    }

    // Build picks lookup: user_id -> match_id -> pick
    const userPicksMap = new Map<string, Map<string, string>>();
    for (const pick of allPicks || []) {
      if (!userPicksMap.has(pick.user_id)) {
        userPicksMap.set(pick.user_id, new Map());
      }
      userPicksMap.get(pick.user_id)!.set(pick.match_id, pick.picked_team);
    }

    // Calculate scores for each user
    const entries: LeaderboardEntry[] = profiles.map((profile) => {
      const userPicks = userPicksMap.get(profile.id) || new Map<string, string>();
      let correct = 0;
      let wrong = 0;
      let missed = 0;
      let totalPoints = 0;

      for (const match of completedMatches) {
        const stage = match.stage as MatchStage;
        const pickedTeam = userPicks.get(match.id);

        const pts = getMatchPoints(stage);
        if (!pickedTeam) {
          missed++;
          totalPoints += pts.missed;
        } else if (pickedTeam === match.winner) {
          correct++;
          totalPoints += pts.correct;
        } else {
          wrong++;
          totalPoints += pts.wrong;
        }
      }

      return {
        user_id: profile.id,
        display_name: profile.display_name,
        correct_picks: correct,
        wrong_picks: wrong,
        missed_picks: missed,
        total_points: totalPoints,
        rank: 0, // will be assigned below
      };
    });

    // Sort by total_points desc, then correct_picks desc
    entries.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return b.correct_picks - a.correct_picks;
    });

    // Assign ranks (same rank for ties)
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (
        i > 0 &&
        entries[i].total_points === entries[i - 1].total_points &&
        entries[i].correct_picks === entries[i - 1].correct_picks
      ) {
        entries[i].rank = entries[i - 1].rank;
      } else {
        entries[i].rank = currentRank;
      }
      currentRank = i + 2; // next potential rank
    }

    return NextResponse.json({ leaderboard: entries });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}