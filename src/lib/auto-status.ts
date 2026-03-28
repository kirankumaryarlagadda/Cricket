import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Auto-update matches from 'upcoming' to 'live' when match_date has passed.
 * Called from server components on page load — no admin action needed.
 * Returns the number of matches updated.
 */
export async function autoUpdateMatchStatus(): Promise<number> {
  const now = new Date().toISOString();

  const { data: shouldBeLive } = await supabaseAdmin
    .from('matches')
    .select('id, match_number')
    .eq('status', 'upcoming')
    .lte('match_date', now);

  if (shouldBeLive && shouldBeLive.length > 0) {
    const ids = shouldBeLive.map((m: any) => m.id);
    await supabaseAdmin
      .from('matches')
      .update({ status: 'live' })
      .in('id', ids);

    return ids.length;
  }

  return 0;
}
