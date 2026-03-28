import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all matches ordered by match_number
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .order('match_number', { ascending: true });

    if (matchError) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Get current user's picks
    const { data: userPicks } = await supabase
      .from('picks')
      .select('match_id, picked_team')
      .eq('user_id', user.id);

    const userPickMap = new Map<string, string>();
    for (const pick of userPicks || []) {
      userPickMap.set(pick.match_id, pick.picked_team);
    }

    // Get all picks for non-upcoming matches (for pick counts)
    const nonUpcomingIds = (matches || [])
      .filter((m) => m.status !== 'upcoming')
      .map((m) => m.id);

    let pickCounts = new Map<string, Record<string, number>>();
    if (nonUpcomingIds.length > 0) {
      const { data: allPicks } = await supabase
        .from('picks')
        .select('match_id, picked_team')
        .in('match_id', nonUpcomingIds);

      for (const pick of allPicks || []) {
        if (!pickCounts.has(pick.match_id)) {
          pickCounts.set(pick.match_id, {});
        }
        const counts = pickCounts.get(pick.match_id)!;
        counts[pick.picked_team] = (counts[pick.picked_team] || 0) + 1;
      }
    }

    // Build response
    const result = (matches || []).map((match) => {
      if (match.status === 'upcoming') {
        return {
          ...match,
          user_has_picked: userPickMap.has(match.id),
          user_picked_team: userPickMap.get(match.id) || null,
        };
      } else {
        return {
          ...match,
          user_has_picked: userPickMap.has(match.id),
          user_picked_team: userPickMap.get(match.id) || null,
          pick_counts: pickCounts.get(match.id) || {},
        };
      }
    });

    return NextResponse.json({ matches: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
