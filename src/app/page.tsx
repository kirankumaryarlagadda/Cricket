import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MatchesDashboard from './MatchesDashboard';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_number', { ascending: true });

  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('user_id', user.id);

  const { data: allPicks } = await supabase.from('picks').select('match_id, picked_team');

  return (
    <MatchesDashboard
      matches={matches ?? []}
      userPicks={picks ?? []}
      allPicks={allPicks ?? []}
      userId={user.id}
    />
  );
}