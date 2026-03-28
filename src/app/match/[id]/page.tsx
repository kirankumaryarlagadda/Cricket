import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { autoUpdateMatchStatus } from '@/lib/auto-status';
import MatchDetailClient from './MatchDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Auto-update upcoming → live when match_date has passed
  await autoUpdateMatchStatus();

  const { data: match } = await supabase.from('matches').select('*').eq('id', id).single();
  if (!match) notFound();

  const { data: picks } = await supabase.from('picks').select('*').eq('match_id', id);

  const { data: userPick } = await supabase
    .from('picks')
    .select('*')
    .eq('match_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { count: totalPickCount } = await supabaseAdmin
    .from('picks')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', id);

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('is_approved', true);

  return (
    <MatchDetailClient
      match={match}
      picks={picks ?? []}
      userPick={userPick}
      profiles={allProfiles ?? []}
      userId={user.id}
      totalPickCount={totalPickCount ?? 0}
    />
  );
}
