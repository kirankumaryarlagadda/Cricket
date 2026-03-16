import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { match_id, winner } = await request.json();

    if (!match_id || !winner) {
      return NextResponse.json({ error: 'match_id and winner are required' }, { status: 400 });
    }

    // Fetch match
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Validate winner is one of the teams
    if (winner !== match.team1 && winner !== match.team2) {
      return NextResponse.json({ error: 'Winner must be one of the teams playing' }, { status: 400 });
    }

    // Update match
    const { data: updatedMatch, error: updateError } = await supabaseAdmin
      .from('matches')
      .update({ winner, status: 'completed' })
      .eq('id', match_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
    }

    return NextResponse.json({ match: updatedMatch });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}