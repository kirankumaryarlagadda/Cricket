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

    const { match_number, team1, team2, venue, match_date, stage } = await request.json();

    if (!match_number || !team1 || !team2 || !venue || !match_date || !stage) {
      return NextResponse.json(
        { error: 'All fields required: match_number, team1, team2, venue, match_date, stage' },
        { status: 400 }
      );
    }

    const { data: match, error: insertError } = await supabaseAdmin
      .from('matches')
      .insert({
        match_number,
        team1,
        team2,
        venue,
        match_date,
        stage,
        status: 'upcoming',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to add match', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
