import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'upcoming') {
      // Only show whether current user has picked + total count
      const { data: userPick } = await supabase
        .from('picks')
        .select('id, picked_team')
        .eq('match_id', id)
        .eq('user_id', user.id)
        .single();

      const { count } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', id);

      return NextResponse.json({
        match,
        user_has_picked: !!userPick,
        user_picked_team: userPick?.picked_team || null,
        total_picks: count || 0,
      });
    } else {
      // Live or completed: show all picks
      const { data: picks } = await supabase
        .from('picks')
        .select('picked_team, profiles(display_name)')
        .eq('match_id', id);

      // Calculate distribution
      const distribution: Record<string, number> = {};
      const allPicks = (picks || []).map((p: any) => {
        distribution[p.picked_team] = (distribution[p.picked_team] || 0) + 1;
        return {
          display_name: p.profiles?.display_name || 'Unknown',
          picked_team: p.picked_team,
        };
      });

      // Get current user's pick
      const userPick = (picks || []).find((p: any) => {
        // We need user's own pick separately
        return false; // handled below
      });

      const { data: myPick } = await supabase
        .from('picks')
        .select('picked_team')
        .eq('match_id', id)
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        match,
        user_has_picked: !!myPick,
        user_picked_team: myPick?.picked_team || null,
        picks: allPicks,
        distribution,
        total_picks: allPicks.length,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
