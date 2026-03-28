'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { LeaderboardEntry } from '@/lib/types';

interface Prize {
  first: number;
  second: number;
  third: number;
  streak: number;
}

interface Props {
  userId: string;
}

export default function LeaderboardClient({ userId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [prizes, setPrizes] = useState<Prize>({ first: 0, second: 0, third: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load leaderboard');
        return r.json();
      })
      .then((data) => {
        setEntries(data.leaderboard ?? []);
        if (data.prizes) setPrizes(data.prizes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const myEntry = entries.find((e) => e.user_id === userId);
  const completedMatches = entries.length > 0 ? (entries[0].correct_picks + entries[0].wrong_picks + entries[0].missed_picks) || 0 : 0;
  const top3 = entries.slice(0, 3);

  const maxStreak = Math.max(...entries.map((e) => e.longest_streak ?? 0), 0);
  const top3Ids = new Set(entries.filter((e) => e.rank <= 3).map((e) => e.user_id));
  const streakEligible = entries.filter((e) => !top3Ids.has(e.user_id));
  const maxStreakEligible = Math.max(...streakEligible.map((e) => e.longest_streak ?? 0), 0);
  const streakLeaders = maxStreakEligible > 1 ? streakEligible.filter((e) => (e.longest_streak ?? 0) === maxStreakEligible) : [];

  const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const medalEmojis = ['🥇', '🥈', '🥉'];
  const medalLabels = ['GOLD', 'SILVER', 'BRONZE'];

  const hasPrizes = prizes.first > 0 || prizes.second > 0 || prizes.third > 0 || prizes.streak > 0;

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <div style={{ color: '#a0aec0', fontWeight: 500 }}>Loading leaderboard...</div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
          <div className="error-message">{error}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>
          🏆 Leaderboard
        </h1>


            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
              <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #667eea', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Matches Played</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#667eea' }}>{completedMatches}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #ecc94b', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Your Rank</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b7791f' }}>{myEntry ? `#${myEntry.rank}` : '—'}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #48bb78', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Your Points</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#48bb78' }}>{myEntry?.total_points ?? 0}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #f6ad55', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Your Streak</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c05621' }}>🔥 {myEntry?.current_streak ?? 0}</div>
              </div>
            </div>

            {/* Podium */}
            {top3.length >= 3 && !(top3[0].rank === top3[1].rank && top3[1].rank === top3[2].rank) && (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <PodiumCard entry={top3[1]} medal={medalEmojis[1]} label={medalLabels[1]} color={medalColors[1]} height={130} isCurrentUser={top3[1].user_id === userId} />
                <PodiumCard entry={top3[0]} medal={medalEmojis[0]} label={medalLabels[0]} color={medalColors[0]} height={160} isCurrentUser={top3[0].user_id === userId} />
                <PodiumCard entry={top3[2]} medal={medalEmojis[2]} label={medalLabels[2]} color={medalColors[2]} height={110} isCurrentUser={top3[2].user_id === userId} />
              </div>
            )}

            {/* Streak Leader Banner */}
            {streakLeaders.length === 1 && (
              <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f6ad5510, #ed893610)', border: '1px solid #f6ad5530', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem' }}>🔥</span>
                <span style={{ fontWeight: 700, color: '#c05621', fontSize: '0.9rem', textAlign: 'center' }}>
                  Streak Prize Leader: <strong>{streakLeaders[0].display_name}</strong> — {streakLeaders[0].longest_streak} wins in a row! (Best outside Top 3)
                </span>
              </div>
            )}
            {streakLeaders.length > 1 && (
              <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f6ad5510, #ed893610)', border: '1px solid #f6ad5530', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem' }}>🔥</span>
                <span style={{ fontWeight: 700, color: '#c05621', fontSize: '0.9rem', textAlign: 'center' }}>
                  Streak Prize: {maxStreakEligible} wins — tied between {streakLeaders.map((s) => s.display_name).join(', ')} (Best outside Top 3)
                </span>
              </div>
            )}

            {/* Ranking Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="leaderboard-header" style={{ display: 'grid', gridTemplateColumns: '50px 1fr 65px 65px 65px 60px 75px', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a0aec0' }}>
                <span>Rank</span><span>Player</span>
                <span style={{ textAlign: 'center' }}>Correct</span>
                <span style={{ textAlign: 'center' }}>Wrong</span>
                <span style={{ textAlign: 'center' }}>Missed</span>
                <span style={{ textAlign: 'center' }}>🔥</span>
                <span style={{ textAlign: 'right' }}>Points</span>
              </div>

              {entries.map((entry) => {
                const isMe = entry.user_id === userId;
                const rankColor = entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#4a5568';
                return (
                  <div key={entry.user_id}>
                    <div className="leaderboard-row" style={{ display: 'grid', gridTemplateColumns: '50px 1fr 65px 65px 65px 60px 75px', padding: '12px 16px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', background: isMe ? '#f0f0ff' : 'transparent' }}>
                      <span style={{ fontWeight: 700, color: rankColor, fontSize: '0.95rem' }}>{entry.rank <= 3 ? medalEmojis[entry.rank - 1] : entry.rank}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: '#1a202c', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.display_name}</span>
                        {isMe && <span style={{ background: '#667eea', color: '#fff', padding: '2px 6px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>YOU</span>}
                      </span>
                      <span style={{ textAlign: 'center', color: '#48bb78', fontWeight: 600, fontSize: '0.85rem' }}>{entry.correct_picks}</span>
                      <span style={{ textAlign: 'center', color: '#f56565', fontWeight: 600, fontSize: '0.85rem' }}>{entry.wrong_picks}</span>
                      <span style={{ textAlign: 'center', color: '#a0aec0', fontWeight: 600, fontSize: '0.85rem' }}>{entry.missed_picks}</span>
                      <span style={{ textAlign: 'center', color: '#c05621', fontWeight: 600, fontSize: '0.85rem' }}>{entry.longest_streak ?? 0}</span>
                      <span style={{ textAlign: 'right', color: '#667eea', fontWeight: 800, fontSize: '0.95rem' }}>{entry.total_points}</span>
                    </div>
                    <div className="leaderboard-card" style={{ display: 'none', padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: isMe ? '#f0f0ff' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: rankColor, fontSize: '1.1rem', minWidth: 28 }}>{entry.rank <= 3 ? medalEmojis[entry.rank - 1] : `#${entry.rank}`}</span>
                          <span style={{ fontWeight: 700, color: '#1a202c', fontSize: '0.95rem' }}>{entry.display_name}</span>
                          {isMe && <span style={{ background: '#667eea', color: '#fff', padding: '2px 6px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700 }}>YOU</span>}
                        </div>
                        <span style={{ color: '#667eea', fontWeight: 800, fontSize: '1.1rem' }}>{entry.total_points} pts</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem' }}>
                        <span style={{ color: '#48bb78' }}>✅ {entry.correct_picks}</span>
                        <span style={{ color: '#f56565' }}>❌ {entry.wrong_picks}</span>
                        <span style={{ color: '#a0aec0' }}>⛔ {entry.missed_picks}</span>
                        <span style={{ color: '#c05621' }}>🔥 {entry.longest_streak ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {entries.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>
                  No leaderboard data yet. Picks will be scored after matches complete.
                </div>
              )}
            </div>
      </main>

      <style jsx global>{`
        @media (max-width: 640px) {
          .leaderboard-header { display: none !important; }
          .leaderboard-row { display: none !important; }
          .leaderboard-card { display: block !important; }
        }
        @media (min-width: 641px) {
          .leaderboard-card { display: none !important; }
        }
      `}</style>
    </>
  );
}

function PodiumCard({
  entry, medal, label, color, height, isCurrentUser,
}: {
  entry: LeaderboardEntry; medal: string; label: string; color: string; height: number; isCurrentUser: boolean;
}) {
  return (
    <div className="card" style={{ textAlign: 'center', border: `2px solid ${color}`, minWidth: 100, flex: '1 1 0', maxWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: height, position: 'relative', background: isCurrentUser ? '#f0f0ff' : '#fff', padding: '1rem 0.5rem' }}>
      <div style={{ fontSize: '1.75rem', marginBottom: 4 }}>{medal}</div>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#1a202c', fontSize: '0.85rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 4px' }}>{entry.display_name}</div>
      <div style={{ fontWeight: 800, color, fontSize: '1.1rem' }}>{entry.total_points} pts</div>
      {isCurrentUser && (
        <span style={{ position: 'absolute', top: 6, right: 6, background: '#667eea', color: '#fff', padding: '2px 5px', borderRadius: 12, fontSize: '0.55rem', fontWeight: 700 }}>YOU</span>
      )}
    </div>
  );
}