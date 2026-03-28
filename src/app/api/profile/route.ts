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

    const { display_name } = await request.json();

    if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2) {
      return NextResponse.json({ error: 'Display name must be at least 2 characters' }, { status: 400 });
    }

    if (display_name.trim().length > 30) {
      return NextResponse.json({ error: 'Display name must be 30 characters or less' }, { status: 400 });
    }

    const newNameLower = display_name.trim().toLowerCase();

    // Get current profile
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, last_name_change')
      .eq('id', user.id)
      .single();

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentNameLower = currentProfile.display_name.toLowerCase();

    // If same name (case-insensitive), no change needed
    if (newNameLower === currentNameLower) {
      return NextResponse.json({ profile: currentProfile });
    }

    // Check once-per-day limit
    if (currentProfile.last_name_change) {
      const lastChange = new Date(currentProfile.last_name_change);
      const now = new Date();
      const hoursSinceChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60);
      if (hoursSinceChange < 24) {
        const hoursLeft = Math.ceil(24 - hoursSinceChange);
        return NextResponse.json({ 
          error: `You can only change your display name once per day. Try again in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.` 
        }, { status: 429 });
      }
    }

    // Check if another user currently has this name
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('display_name', display_name.trim())
      .neq('id', user.id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'This display name is already taken by another player.' }, { status: 409 });
    }

    // Check if this name was previously used by someone else (reserved)
    const { data: reserved } = await supabaseAdmin
      .from('reserved_names')
      .select('originally_used_by')
      .eq('name_lower', newNameLower)
      .neq('originally_used_by', user.id)
      .maybeSingle();

    if (reserved) {
      return NextResponse.json({ 
        error: 'This display name was previously used by another player and is reserved. Please choose a different name.' 
      }, { status: 409 });
    }

    // Reserve the OLD name
    const { data: alreadyReserved } = await supabaseAdmin
      .from('reserved_names')
      .select('id')
      .eq('name_lower', currentNameLower)
      .eq('originally_used_by', user.id)
      .maybeSingle();

    if (!alreadyReserved) {
      await supabaseAdmin
        .from('reserved_names')
        .insert({ name_lower: currentNameLower, originally_used_by: user.id });
    }

    // Reserve the NEW name
    const { data: newAlreadyReserved } = await supabaseAdmin
      .from('reserved_names')
      .select('id')
      .eq('name_lower', newNameLower)
      .eq('originally_used_by', user.id)
      .maybeSingle();

    if (!newAlreadyReserved) {
      await supabaseAdmin
        .from('reserved_names')
        .insert({ name_lower: newNameLower, originally_used_by: user.id });
    }

    // Update display name + last_name_change timestamp
    const { data: profile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ display_name: display_name.trim(), last_name_change: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update display name' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
