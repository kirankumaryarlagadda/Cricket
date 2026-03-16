import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyPicksClient from './MyPicksClient';

export default async function MyPicksPage() {
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

  return <MyPicksClient matches={matches ?? []} userPicks={picks ?? []} />;
}