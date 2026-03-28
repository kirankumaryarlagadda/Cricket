import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PrizesClient from './PrizesClient';

export default async function PrizesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <PrizesClient />;
}
