import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id, picked_team } = await request.json();

    if (!match_id || !picked_team) {
      return NextResponse.json({ error: 'match_id and picked_team are required' }, { status: 400 });
    }

    // Fetch the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check match is upcoming
    if (match.status !== 'upcoming') {
      return NextResponse.json({ error: 'Picks can only be made for upcoming matches' }, { status: 400 });
    }

    // Check picked_team is valid
    if (picked_team !== match.team1 && picked_team !== match.team2) {
      return NextResponse.json({ error: 'Invalid team selection. Must be one of the teams playing' }, { status: 400 });
    }

    // Check deadline: at least 30 minutes before match_date
    const matchDate = new Date(match.match_date);
    const deadline = new Date(matchDate.getTime() - 30 * 60 * 1000);
    const now = new Date();

    if (now >= deadline) {
      return NextResponse.json({ error: 'Pick deadline has passed (30 minutes before match)' }, { status: 400 });
    }

    // Check if user already picked for this match
    const { data: existingPick } = await supabase
      .from('picks')
      .select('id')
      .eq('user_id', user.id)
      .eq('match_id', match_id)
      .single();

    if (existingPick) {
      return NextResponse.json({ error: 'You have already made a pick for this match' }, { status: 409 });
    }

    // Insert pick
    const { data: pick, error: insertError } = await supabase
      .from('picks')
      .insert({
        user_id: user.id,
        match_id,
        picked_team,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to submit pick' }, { status: 500 });
    }

    return NextResponse.json({ pick }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('match_id');

    let query = supabase
      .from('picks')
      .select('*, matches(*)')
      .eq('user_id', user.id);

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data: picks, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
    }

    return NextResponse.json({ picks });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}