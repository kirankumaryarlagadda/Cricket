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

    const { match_id, ...fields } = await request.json();

    if (!match_id) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 });
    }

    // Only allow specific fields to be updated
    const allowedFields = ['venue', 'match_date', 'status', 'stage', 'team1', 'team2'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updateData[key] = fields[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updatedMatch, error: updateError } = await supabaseAdmin
      .from('matches')
      .update(updateData)
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