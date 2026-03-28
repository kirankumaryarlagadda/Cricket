'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ForceResetPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      if (!user.user_metadata?.force_password_reset) {
        router.push('/');
        return;
      }
      setChecking(false);
    };
    check();
  }, [supabase, router]);

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
      // Update password
      const { error: pwError } = await supabase.auth.updateUser({
        password,
      });

      if (pwError) {
        setError(pwError.message);
        return;
      }

      // Clear the force_password_reset flag
      const { error: metaError } = await supabase.auth.updateUser({
        data: { force_password_reset: false },
      });

      if (metaError) {
        // Password changed but flag didn't clear — not critical
        console.warn('Could not clear reset flag:', metaError.message);
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

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{ color: 'white', fontSize: '1.1rem' }}>Loading...</div>
      </div>
    );
  }

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
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
            <h1
              className="gradient-text"
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                marginBottom: '0.5rem',
              }}
            >
              Set New Password
            </h1>
            <p style={{ color: '#718096', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Your password was reset by an admin.<br />
              Please choose a new password to continue.
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
                Password updated!
              </p>
              <p style={{ color: '#2f855a', fontSize: '0.85rem' }}>
                Redirecting you to the app...
              </p>
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
                  {loading ? 'Updating...' : 'Set New Password'}
                </button>
              </form>

              <p
                style={{
                  textAlign: 'center',
                  marginTop: '1.25rem',
                  color: '#a0aec0',
                  fontSize: '0.8rem',
                }}
              >
                ⚠️ You must set a new password before using the app.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
