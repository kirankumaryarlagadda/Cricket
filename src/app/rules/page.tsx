import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RulesClient from './RulesClient';

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <RulesClient />;
}
