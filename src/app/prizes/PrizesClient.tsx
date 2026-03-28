'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface Prize { first: number; second: number; third: number; streak: number; }

export default function PrizesClient() {
  const [prizes, setPrizes] = useState<Prize>({ first: 0, second: 0, third: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => { if (data.prizes) setPrizes(data.prizes); })
      .finally(() => setLoading(false));
  }, []);

  const hasPrizes = prizes.first > 0 || prizes.second > 0 || prizes.third > 0 || prizes.streak > 0;

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <div style={{ color: '#a0aec0', fontWeight: 500 }}>Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          💰 Prizes
        </h1>

        {hasPrizes ? (
          <>
            {/* Prize Cards */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #667eea08, #764ba208)', border: '1px solid #667eea20', padding: '2rem 1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>🏆</span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1a202c', marginTop: 8 }}>Prize Pool</h2>
                <p style={{ color: '#a0aec0', fontSize: '0.85rem', marginTop: 4 }}>Awarded at the end of the tournament</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: 500, margin: '0 auto' }}>
                {prizes.first > 0 && (
                  <div style={{ padding: '1.5rem', background: '#ffd70015', borderRadius: 16, border: '2px solid #ffd70040', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🥇</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b7791f', textTransform: 'uppercase', marginBottom: 8 }}>1st Place</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#b7791f' }}>${prizes.first}</div>
                  </div>
                )}
                {prizes.second > 0 && (
                  <div style={{ padding: '1.5rem', background: '#c0c0c015', borderRadius: 16, border: '2px solid #c0c0c040', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🥈</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: 8 }}>2nd Place</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#718096' }}>${prizes.second}</div>
                  </div>
                )}
                {prizes.third > 0 && (
                  <div style={{ padding: '1.5rem', background: '#cd7f3215', borderRadius: 16, border: '2px solid #cd7f3240', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🥉</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9c6322', textTransform: 'uppercase', marginBottom: 8 }}>3rd Place</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#9c6322' }}>${prizes.third}</div>
                  </div>
                )}
                {prizes.streak > 0 && (
                  <div style={{ padding: '1.5rem', background: '#f6ad5515', borderRadius: 16, border: '2px solid #f6ad5540', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>🔥</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c05621', textTransform: 'uppercase', marginBottom: 8 }}>Best Streak</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#c05621' }}>${prizes.streak}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: 6 }}>Outside Top 3 only</div>
                  </div>
                )}
              </div>
            </div>

            {/* Distribution Rules */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>📜 Distribution Rules</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '🥇', text: '1st Place — Highest ranked player at end of tournament' },
                  { icon: '🥈', text: '2nd Place — Second highest ranked player' },
                  { icon: '🥉', text: '3rd Place — Third highest ranked player' },
                  { icon: '🔥', text: 'Longest Streak — Best winning streak among players outside the Top 3' },
                  { icon: '🤝', text: 'If players are tied, the prize is split equally' },
                  { icon: '📅', text: 'All prizes are awarded after the final match of the tournament' },
                ].map((rule, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0, width: 28, textAlign: 'center' }}>{rule.icon}</span>
                    <span style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.5 }}>{rule.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: '#a0aec0', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>💰</div>
            <div style={{ fontWeight: 600 }}>No prizes configured yet. Check back later!</div>
          </div>
        )}
      </main>
    </>
  );
}
