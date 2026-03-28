'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    const init = async () => {
      // Check if we already have a session (from the callback redirect)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        setReady(true);
        return;
      }

      // Listen for PASSWORD_RECOVERY event (hash-based flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (event === 'PASSWORD_RECOVERY' && session) {
          setReady(true);
        } else if (event === 'SIGNED_IN' && session) {
          // Also accept SIGNED_IN — some Supabase versions fire this instead
          setReady(true);
        }
      });

      // After 8 seconds, if still not ready, show error
      timeoutId = setTimeout(() => {
        if (mounted && !ready) {
          setExpired(true);
        }
      }, 8000);

      return () => {
        subscription.unsubscribe();
      };
    };

    init();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div className="card" style={{ padding: '2.5rem 2rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
            <h1
              className="gradient-text"
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                marginBottom: '0.25rem',
              }}
            >
              Reset Password
            </h1>
            <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
              {success ? 'Password updated!' : 'Choose a new password'}
            </p>
          </div>

          {success ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                background: '#f0fff4',
                borderRadius: '12px',
                border: '1px solid #c6f6d5',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontWeight: 700, color: '#276749', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Password updated successfully!
              </p>
              <p style={{ color: '#2f855a', fontSize: '0.85rem' }}>
                Redirecting you to the app...
              </p>
            </div>
          ) : expired ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏰</div>
              <p style={{ fontWeight: 700, color: '#c53030', fontSize: '1rem', marginBottom: '0.75rem' }}>
                Reset link expired or invalid
              </p>
              <p style={{ color: '#718096', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                The password reset link may have expired or was already used. 
                Please request a new one from the login page.
              </p>
              <button
                className="btn-primary"
                onClick={() => router.push('/login')}
              >
                ← Back to Login
              </button>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p style={{ color: '#718096', fontSize: '0.9rem' }}>
                Verifying reset link...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {error && (
                <div className="error-message" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleReset}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label" htmlFor="new-password">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label" htmlFor="confirm-password">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
