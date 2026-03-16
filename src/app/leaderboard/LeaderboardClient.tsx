'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { LeaderboardEntry } from '@/lib/types';

interface Props {
  userId: string;
}

export default function LeaderboardClient({ userId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load leaderboard');
        return r.json();
      })
      .then((data) => setEntries(data.leaderboard ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const myEntry = entries.find((e) => e.user_id === userId);
  const completedMatches = entries.length > 0 ? (entries[0].correct_picks + entries[0].wrong_picks + entries[0].missed_picks) || 0 : 0;
  const top3 = entries.slice(0, 3);

  const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const medalEmojis = ['🥇', '🥈', '🥉'];
  const medalLabels = ['GOLD', 'SILVER', 'BRONZE'];

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
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          🏆 Leaderboard
        </h1>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {/* Matches Played */}
          <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #667eea' }}>
            <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Matches Played
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#667eea' }}>
              {completedMatches}
            </div>
          </div>
          {/* Your Rank */}
          <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #ecc94b' }}>
            <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Your Rank
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b7791f' }}>
              {myEntry ? `#${myEntry.rank}` : '—'}
            </div>
          </div>
          {/* Your Points */}
          <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #48bb78' }}>
            <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Your Points
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#48bb78' }}>
              {myEntry?.total_points ?? 0}
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {/* Silver - index 1 */}
            <PodiumCard
              entry={top3[1]}
              medal={medalEmojis[1]}
              label={medalLabels[1]}
              color={medalColors[1]}
              height={140}
              isCurrentUser={top3[1].user_id === userId}
            />
            {/* Gold - index 0, tallest */}
            <PodiumCard
              entry={top3[0]}
              medal={medalEmojis[0]}
              label={medalLabels[0]}
              color={medalColors[0]}
              height={170}
              isCurrentUser={top3[0].user_id === userId}
            />
            {/* Bronze - index 2 */}
            <PodiumCard
              entry={top3[2]}
              medal={medalEmojis[2]}
              label={medalLabels[2]}
              color={medalColors[2]}
              height={120}
              isCurrentUser={top3[2].user_id === userId}
            />
          </div>
        )}

        {/* Full Ranking Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 80px 80px 80px 90px',
              padding: '12px 20px',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a0aec0',
            }}
          >
            <span>Rank</span>
            <span>Player</span>
            <span style={{ textAlign: 'center' }}>Correct</span>
            <span style={{ textAlign: 'center' }}>Wrong</span>
            <span style={{ textAlign: 'center' }}>Missed</span>
            <span style={{ textAlign: 'right' }}>Points</span>
          </div>

          {/* Rows */}
          {entries.map((entry) => {
            const isMe = entry.user_id === userId;
            const rankColor =
              entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#4a5568';

            return (
              <div
                key={entry.user_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 80px 80px 80px 90px',
                  padding: '12px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  alignItems: 'center',
                  background: isMe ? '#f0f0ff' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontWeight: 700, color: rankColor, fontSize: '0.95rem' }}>
                  {entry.rank <= 3 ? medalEmojis[entry.rank - 1] : entry.rank}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#1a202c', fontSize: '0.9rem' }}>
                    {entry.display_name}
                  </span>
                  {isMe && (
                    <span
                      style={{
                        background: '#667eea',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                    >
                      YOU
                    </span>
                  )}
                </span>
                <span style={{ textAlign: 'center', color: '#48bb78', fontWeight: 600, fontSize: '0.9rem' }}>
                  {entry.correct_picks}
                </span>
                <span style={{ textAlign: 'center', color: '#f56565', fontWeight: 600, fontSize: '0.9rem' }}>
                  {entry.wrong_picks}
                </span>
                <span style={{ textAlign: 'center', color: '#a0aec0', fontWeight: 600, fontSize: '0.9rem' }}>
                  {entry.missed_picks}
                </span>
                <span style={{ textAlign: 'right', color: '#667eea', fontWeight: 800, fontSize: '1rem' }}>
                  {entry.total_points}
                </span>
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
    </>
  );
}

function PodiumCard({
  entry,
  medal,
  label,
  color,
  height,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  medal: string;
  label: string;
  color: string;
  height: number;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        border: `2px solid ${color}`,
        minWidth: 140,
        flex: '0 1 180px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height,
        position: 'relative',
        background: isCurrentUser ? '#f0f0ff' : '#fff',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: 4 }}>{medal}</div>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, color: '#1a202c', fontSize: '0.95rem', marginBottom: 2 }}>
        {entry.display_name}
      </div>
      <div style={{ fontWeight: 800, color, fontSize: '1.25rem' }}>{entry.total_points} pts</div>
      {isCurrentUser && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: '#667eea',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 12,
            fontSize: '0.6rem',
            fontWeight: 700,
          }}
        >
          YOU
        </span>
      )}
    </div>
  );
}