import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { display_name } = await request.json();

    if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2) {
      return NextResponse.json({ error: 'Display name must be at least 2 characters' }, { status: 400 });
    }

    const nameLower = display_name.trim().toLowerCase();

    // Check if currently used by someone
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('display_name', display_name.trim())
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ taken: true, reason: 'This display name is already in use.' });
    }

    // Check if reserved (previously used by someone)
    const { data: reserved } = await supabaseAdmin
      .from('reserved_names')
      .select('id')
      .eq('name_lower', nameLower)
      .maybeSingle();

    if (reserved) {
      return NextResponse.json({ taken: true, reason: 'This display name was previously used and is reserved.' });
    }

    return NextResponse.json({ taken: false });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
