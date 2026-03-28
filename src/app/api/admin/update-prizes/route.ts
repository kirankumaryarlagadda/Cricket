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

    const { first, second, third, streak } = await request.json();

    if (first == null || second == null || third == null || streak == null) {
      return NextResponse.json(
        { error: 'first, second, third, and streak are all required' },
        { status: 400 }
      );
    }

    const prizes = { first, second, third, streak };

    const { data, error: upsertError } = await supabaseAdmin
      .from('app_settings')
      .upsert(
        { key: 'prizes', value: prizes },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to update prizes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, prizes: data.value });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
