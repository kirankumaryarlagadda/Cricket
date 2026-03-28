import { createClient } from '@/lib/supabase/server';

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '3rem 2.5rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
          <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Waiting for Approval
          </h1>
          <p style={{ color: '#4a5568', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Your account <strong>{user?.email}</strong> has been registered successfully!
            <br /><br />
            The admin needs to approve your account before you can start making picks.
            Please check back later or contact the admin.
          </p>
          <div
            style={{
              background: '#f7fafc',
              borderRadius: 12,
              padding: '1rem',
              color: '#a0aec0',
              fontSize: '0.85rem',
            }}
          >
            💡 Once approved, refresh this page and you&apos;ll be redirected automatically.
          </div>
          <form action="/api/auth/signout" method="POST" style={{ marginTop: '1.5rem' }}>
            <a
              href="/login"
              onClick={async (e) => {}}
              style={{
                color: '#667eea',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ← Back to Login
            </a>
          </form>
        </div>
      </div>
    </div>
  );
}
