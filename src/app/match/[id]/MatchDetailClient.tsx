'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Match, Pick, getMatchTimeIST } from '@/lib/types';
import { getTeamColor, getTeamFullName } from '@/lib/teams';

interface Props {
  match: Match;
  picks: Pick[];
  userPick: Pick | null;
  profiles: { id: string; display_name: string }[];
  userId: string;
}

function isPickDeadlinePassed(matchDate: string): boolean {
  const deadline = new Date(new Date(matchDate).getTime() - 30 * 60 * 1000);
  return new Date() >= deadline;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MatchDetailClient({ match, picks, userPick: initialUserPick, profiles, userId }: Props) {
  const [userPick, setUserPick] = useState(initialUserPick);
  const [pickingTeam, setPickingTeam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchStarted = match.status === 'live' || match.status === 'completed';
  const deadlinePassed = isPickDeadlinePassed(match.match_date);

  const team1Picks = picks.filter((p) => p.picked_team === match.team1);
  const team2Picks = picks.filter((p) => p.picked_team === match.team2);
  const totalPicks = picks.length;

  const getName = (uid: string) => profiles.find((p) => p.id === uid)?.display_name ?? 'Unknown';
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handlePick = async (team: string) => {
    setPickingTeam(team);
    setError(null);
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: match.id, picked_team: team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit pick');
      setUserPick(data.pick);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPickingTeam(null);
    }
  };

  const statusBadge = {
    live: { bg: '#f56565', text: 'LIVE 🔴' },
    upcoming: { bg: '#667eea', text: 'UPCOMING' },
    completed: { bg: '#48bb78', text: 'COMPLETED' },
  }[match.status];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Match Header */}
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ color: '#a0aec0', fontWeight: 600, fontSize: '0.85rem' }}>
              Match #{match.match_number}
            </span>
            <span
              style={{
                background: statusBadge.bg,
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.7rem',
                fontWeight: 700,
                ...(match.status === 'live' ? { animation: 'pulse 1.5s infinite' } : {}),
              }}
            >
              {statusBadge.text}
            </span>
            {(match.stage === 'qualifier' || match.stage === 'eliminator' || match.stage === 'final') && (
              <span className="badge badge-gold">
                🏆 {match.stage === 'final' ? 'FINAL' : 'KNOCKOUT'}
              </span>
            )}
          </div>

          <div style={{ color: '#a0aec0', fontSize: '0.85rem', marginBottom: 16 }}>
            {formatDate(match.match_date)} · {getMatchTimeIST(match.match_date)} · {match.venue}
          </div>

          {/* Big VS Display */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '1rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: getTeamColor(match.team1) }}>
                {match.team1}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: 4 }}>
                {getTeamFullName(match.team1)}
              </div>
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#a0aec0',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '2px solid #e2e8f0',
              }}
            >
              VS
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: getTeamColor(match.team2) }}>
                {match.team2}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: 4 }}>
                {getTeamFullName(match.team2)}
              </div>
            </div>
          </div>

          {/* Winner banner for completed */}
          {match.status === 'completed' && match.winner && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 20px',
                background: `${getTeamColor(match.winner)}15`,
                borderRadius: 12,
                display: 'inline-block',
              }}
            >
              <span style={{ fontWeight: 700, color: getTeamColor(match.winner), fontSize: '1rem' }}>
                🏆 {getTeamFullName(match.winner)} won!
              </span>
            </div>
          )}
        </div>

        {/* Your Pick Banner */}
        {userPick && (
          <div
            className="card"
            style={{
              marginBottom: '1.5rem',
              textAlign: 'center',
              background: `${getTeamColor(userPick.picked_team)}10`,
              border: `2px solid ${getTeamColor(userPick.picked_team)}40`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Your Pick
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getTeamColor(userPick.picked_team) }}>
              {userPick.picked_team}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
              {getTeamFullName(userPick.picked_team)}
            </div>
            {match.status === 'completed' && match.winner && (
              <div style={{ marginTop: 8 }}>
                {userPick.picked_team === match.winner ? (
                  <span className="badge badge-success">✅ Correct Pick!</span>
                ) : (
                  <span className="badge badge-error">❌ Wrong Pick</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* PICKS REVEALED (match started) */}
        {matchStarted && (
          <section>
            {/* Pick Distribution Bar */}
            {totalPicks > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                  📊 Pick Distribution
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4a5568', marginBottom: 6 }}>
                  <span>
                    <strong style={{ color: getTeamColor(match.team1) }}>{match.team1}</strong>{' '}
                    {team1Picks.length} ({totalPicks > 0 ? Math.round((team1Picks.length / totalPicks) * 100) : 0}%)
                  </span>
                  <span style={{ color: '#a0aec0' }}>{totalPicks} total picks</span>
                  <span>
                    <strong style={{ color: getTeamColor(match.team2) }}>{match.team2}</strong>{' '}
                    {team2Picks.length} ({totalPicks > 0 ? Math.round((team2Picks.length / totalPicks) * 100) : 0}%)
                  </span>
                </div>
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#f0f0f0' }}>
                  <div
                    style={{
                      width: `${totalPicks > 0 ? (team1Picks.length / totalPicks) * 100 : 50}%`,
                      background: getTeamColor(match.team1),
                      transition: 'width 0.4s',
                    }}
                  />
                  <div
                    style={{
                      width: `${totalPicks > 0 ? (team2Picks.length / totalPicks) * 100 : 50}%`,
                      background: getTeamColor(match.team2),
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
              </div>
            )}

            {/* All Player Picks Grid */}
            <div className="card">
              <h3 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
                👥 All Picks
              </h3>
              {picks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '1rem' }}>
                  No picks were made for this match.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {picks.map((pick) => {
                    const isMe = pick.user_id === userId;
                    const name = getName(pick.user_id);
                    const teamColor = getTeamColor(pick.picked_team);
                    return (
                      <div
                        key={pick.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: `1px solid ${isMe ? '#667eea' : '#e2e8f0'}`,
                          borderLeft: `4px solid ${teamColor}`,
                          background: isMe ? '#f0f0ff' : '#fff',
                          boxShadow: isMe ? '0 0 12px rgba(102,126,234,0.15)' : 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Initials circle */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: '#fff',
                            background: teamColor,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#1a202c',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {name}
                            {isMe && (
                              <span
                                style={{
                                  background: '#667eea',
                                  color: '#fff',
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: teamColor, fontWeight: 600 }}>
                            → {pick.picked_team}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* PICKS HIDDEN (upcoming) */}
        {match.status === 'upcoming' && (
          <section>
            <div className="card" style={{ textAlign: 'center' }}>
              {!deadlinePassed && !userPick ? (
                <>
                  <h3 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
                    Make Your Pick
                  </h3>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                    {[match.team1, match.team2].map((team) => {
                      const teamColor = getTeamColor(team);
                      return (
                        <button
                          key={team}
                          disabled={!!pickingTeam}
                          onClick={() => handlePick(team)}
                          style={{
                            padding: '14px 32px',
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            border: `2px solid ${teamColor}`,
                            background: pickingTeam === team ? teamColor : 'transparent',
                            color: pickingTeam === team ? '#fff' : teamColor,
                            transition: 'all 0.2s',
                            minWidth: 120,
                          }}
                        >
                          {pickingTeam === team ? '...' : team}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : !deadlinePassed && userPick ? (
                <>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
                  <div style={{ color: '#1a202c', fontWeight: 600, fontSize: '1rem' }}>
                    You picked <strong style={{ color: getTeamColor(userPick.picked_team) }}>{userPick.picked_team}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏰</div>
                  <div style={{ color: '#a0aec0', fontWeight: 600 }}>
                    Pick deadline has passed
                  </div>
                </>
              )}

              <div
                style={{
                  marginTop: 20,
                  padding: '16px',
                  background: '#f7fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>🔒</div>
                <div style={{ color: '#a0aec0', fontSize: '0.85rem', fontWeight: 500 }}>
                  Picks will be revealed when the match starts
                </div>
                {totalPicks > 0 && (
                  <div style={{ color: '#667eea', fontWeight: 600, fontSize: '0.9rem', marginTop: 8 }}>
                    {totalPicks} pick{totalPicks !== 1 ? 's' : ''} submitted so far
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}