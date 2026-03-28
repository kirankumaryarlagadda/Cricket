import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: '3rem' }}>🚫</div>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 700 }}>Access Denied</h1>
        <p style={{ color: '#a0aec0' }}>You do not have admin privileges.</p>
        <a href="/" style={{ color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>
          ← Back to Matches
        </a>
      </main>
    );
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_number', { ascending: true });

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: prizeSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'prizes')
    .single();

  const prizes = prizeSetting?.value ?? { first: 0, second: 0, third: 0, streak: 0 };

  return (
    <AdminClient
      matches={matches ?? []}
      profiles={allProfiles ?? []}
      prizes={prizes as { first: number; second: number; third: number; streak: number }}
      userId={user.id}
    />
  );
}