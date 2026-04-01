import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMatchPoints } from '@/lib/scoring';
import type { LeaderboardEntry, MatchStage } from '@/lib/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed matches ordered by match_number
    const { data: completedMatches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed')
      .order('match_number', { ascending: true });

    if (matchError) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Get all approved profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', true);

    if (profilesError || !profiles) {
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Get prizes from app_settings
    let prizes = { first: 0, second: 0, third: 0, streak: 0 };
    const { data: prizeSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'prizes')
      .single();
    if (prizeSetting?.value) {
      prizes = prizeSetting.value as typeof prizes;
    }

    if (!completedMatches || completedMatches.length === 0) {
      const leaderboard: LeaderboardEntry[] = profiles.map((p) => ({
        user_id: p.id,
        display_name: p.display_name,
        correct_picks: 0,
        wrong_picks: 0,
        missed_picks: 0,
        total_points: 0,
        rank: 1,
        current_streak: 0,
        longest_streak: 0,
      }));
      return NextResponse.json({ leaderboard, prizes });
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

    // Build picks lookup: user_id -> match_id -> picked_team
    const userPicksMap = new Map<string, Map<string, string>>();
    for (const pick of allPicks || []) {
      if (!userPicksMap.has(pick.user_id)) {
        userPicksMap.set(pick.user_id, new Map());
      }
      userPicksMap.get(pick.user_id)!.set(pick.match_id, pick.picked_team);
    }

    // Calculate scores + streaks for each user
    const entries: LeaderboardEntry[] = profiles.map((profile) => {
      const userPicks = userPicksMap.get(profile.id) || new Map<string, string>();
      let correct = 0;
      let wrong = 0;
      let missed = 0;
      let totalPoints = 0;
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // completedMatches is ordered by match_number
      for (const match of completedMatches) {
        // Skip No Result matches — don't affect scores or streaks
        if (match.winner === 'NR') continue;

        const stage = match.stage as MatchStage;
        const pickedTeam = userPicks.get(match.id);
        const pts = getMatchPoints(stage);

        if (!pickedTeam) {
          missed++;
          totalPoints += pts.missed;
          tempStreak = 0; // streak broken
        } else if (pickedTeam === match.winner) {
          correct++;
          totalPoints += pts.correct;
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
          wrong++;
          totalPoints += pts.wrong;
          tempStreak = 0; // streak broken
        }
      }
      currentStreak = tempStreak; // streak at the end of all completed matches

      return {
        user_id: profile.id,
        display_name: profile.display_name,
        correct_picks: correct,
        wrong_picks: wrong,
        missed_picks: missed,
        total_points: totalPoints,
        rank: 0,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      };
    });

    // Sort tiebreakers: points → correct picks → longest streak → fewer wrong → fewer missed
    entries.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.correct_picks !== a.correct_picks) return b.correct_picks - a.correct_picks;
      if ((b.longest_streak ?? 0) !== (a.longest_streak ?? 0)) return (b.longest_streak ?? 0) - (a.longest_streak ?? 0);
      if (a.wrong_picks !== b.wrong_picks) return a.wrong_picks - b.wrong_picks; // fewer wrong = better
      return a.missed_picks - b.missed_picks; // fewer missed = better
    });

    // Assign ranks (same rank only if ALL tiebreakers are equal)
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (
        i > 0 &&
        entries[i].total_points === entries[i - 1].total_points &&
        entries[i].correct_picks === entries[i - 1].correct_picks &&
        (entries[i].longest_streak ?? 0) === (entries[i - 1].longest_streak ?? 0) &&
        entries[i].wrong_picks === entries[i - 1].wrong_picks &&
        entries[i].missed_picks === entries[i - 1].missed_picks
      ) {
        entries[i].rank = entries[i - 1].rank;
      } else {
        entries[i].rank = currentRank;
      }
      currentRank = i + 2;
    }

    return NextResponse.json({ leaderboard: entries, prizes });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}