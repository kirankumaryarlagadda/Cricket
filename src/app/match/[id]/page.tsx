import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import MatchDetailClient from './MatchDetailClient';

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

  const { data: match } = await supabase.from('matches').select('*').eq('id', id).single();
  if (!match) notFound();

  const { data: picks } = await supabase.from('picks').select('*').eq('match_id', id);

  const { data: userPick } = await supabase
    .from('picks')
    .select('*')
    .eq('match_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  // Get display names for all pickers
  const userIds = (picks ?? []).map((p) => p.user_id);
  let profiles: { id: string; display_name: string }[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
    profiles = data ?? [];
  }

  return (
    <MatchDetailClient
      match={match}
      picks={picks ?? []}
      userPick={userPick}
      profiles={profiles}
      userId={user.id}
    />
  );
}