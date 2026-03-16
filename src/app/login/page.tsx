'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push('/');
      router.refresh();
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
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* Login Card */}
        <div className="card" style={{ padding: '2.5rem 2rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏏</div>
            <h1
              className="gradient-text"
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                marginBottom: '0.25rem',
              }}
            >
              IPL Picks 2026
            </h1>
            <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
              Predict. Compete. Win.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div
              style={{
                textAlign: 'right',
                marginBottom: '1.5rem',
              }}
            >
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          {/* Signup link */}
          <p
            style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              fontSize: '0.875rem',
              color: '#a0aec0',
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              style={{
                color: '#667eea',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign Up
            </Link>
          </p>
        </div>

        {/* Scoring Rules Preview */}
        <div
          style={{
            marginTop: '1.5rem',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            color: 'white',
          }}
        >
          <p
            style={{
              fontWeight: 700,
              fontSize: '0.85rem',
              marginBottom: '0.75rem',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              opacity: 0.9,
            }}
          >
            ⚡ Scoring System
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>+5 / -3</div>
              <div style={{ opacity: 0.75, marginTop: '0.15rem' }}>League</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>+10 / -5</div>
              <div style={{ opacity: 0.75, marginTop: '0.15rem' }}>Knockout</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>+15 / -10</div>
              <div style={{ opacity: 0.75, marginTop: '0.15rem' }}>Final</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}