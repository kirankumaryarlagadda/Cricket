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
      // Only return current user's pick + total count
      const { data: userPick } = await supabase
        .from('picks')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', user.id)
        .single();

      const { count } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', id);

      return NextResponse.json({
        user_pick: userPick || null,
        total_picks: count || 0,
      });
    } else {
      // Live or completed: return all picks with display names
      const { data: picks } = await supabase
        .from('picks')
        .select('id, picked_team, created_at, user_id, profiles(display_name)')
        .eq('match_id', id);

      const formattedPicks = (picks || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        picked_team: p.picked_team,
        display_name: p.profiles?.display_name || 'Unknown',
        created_at: p.created_at,
      }));

      return NextResponse.json({
        picks: formattedPicks,
        total_picks: formattedPicks.length,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
