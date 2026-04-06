'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Match, Pick, getMatchTimeLocal } from '@/lib/types';
import { getTeamColor, getTeamFullName } from '@/lib/teams';

interface Props {
  match: Match;
  picks: Pick[];
  userPick: Pick | null;
  profiles: { id: string; display_name: string }[];
  userId: string;
  totalPickCount: number;
}

function isPickDeadlinePassed(matchDate: string): boolean {
  const deadline = new Date(new Date(matchDate).getTime() - 30 * 60 * 1000);
  return new Date() >= deadline;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MatchDetailClient({ match, picks, userPick: initialUserPick, profiles, userId, totalPickCount }: Props) {
  const [userPick, setUserPick] = useState(initialUserPick);
  const [pickingTeam, setPickingTeam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchStarted = match.status === 'live' || match.status === 'completed';
  const deadlinePassed = isPickDeadlinePassed(match.match_date);

  const team1Picks = picks.filter((p) => p.picked_team === match.team1);
  const team2Picks = picks.filter((p) => p.picked_team === match.team2);
  const totalPicks = picks.length;

  // Find players who skipped (approved profiles who didn't pick)
  const pickerIds = new Set(picks.map((p) => p.user_id));
  const skippedProfiles = profiles.filter((p) => !pickerIds.has(p.id));

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
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

          <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.5 }}>
            {formatDate(match.match_date)} · {getMatchTimeLocal(match.match_date)} · <span style={match.venue.includes('DEMO') ? { color: '#f56565', fontWeight: 700 } : {}}>{match.venue}</span>
          </div>

          {/* Big VS Display */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '1rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', fontWeight: 900, color: getTeamColor(match.team1) }}>
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
                width: 40,
                height: 40,
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
              <div style={{ fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', fontWeight: 900, color: getTeamColor(match.team2) }}>
                {match.team2}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: 4 }}>
                {getTeamFullName(match.team2)}
              </div>
            </div>
          </div>

          {/* Winner banner */}
          {match.status === 'completed' && match.winner && match.winner !== 'NR' && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 20px',
                background: `${getTeamColor(match.winner)}15`,
                borderRadius: 12,
                display: 'inline-block',
              }}
            >
              <span style={{ fontWeight: 700, color: getTeamColor(match.winner), fontSize: '0.9rem' }}>
                🏆 {getTeamFullName(match.winner)} won!
              </span>
            </div>
          )}
          {match.status === 'completed' && match.winner === 'NR' && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 20px',
                background: '#a0aec015',
                borderRadius: 12,
                display: 'inline-block',
              }}
            >
              <span style={{ fontWeight: 700, color: '#718096', fontSize: '0.9rem' }}>
                ☔ Match Abandoned — No Result
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
            <div style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', fontWeight: 800, color: getTeamColor(userPick.picked_team) }}>
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

        {/* PICKS REVEALED (match started — live or completed) */}
        {matchStarted && (
          <section>
            {/* Pick Distribution Bar */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                📊 Pick Distribution
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#4a5568', marginBottom: 6, flexWrap: 'wrap', gap: 2 }}>
                <span>
                  <strong style={{ color: getTeamColor(match.team1) }}>{match.team1}</strong>{' '}
                  {team1Picks.length} ({totalPicks > 0 ? Math.round((team1Picks.length / totalPicks) * 100) : 0}%)
                </span>
                <span style={{ color: '#a0aec0' }}>{totalPicks} picked · {skippedProfiles.length} skipped</span>
                <span>
                  <strong style={{ color: getTeamColor(match.team2) }}>{match.team2}</strong>{' '}
                  {team2Picks.length} ({totalPicks > 0 ? Math.round((team2Picks.length / totalPicks) * 100) : 0}%)
                </span>
              </div>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#f0f0f0' }}>
                {totalPicks > 0 ? (
                  <>
                    <div style={{ width: `${(team1Picks.length / totalPicks) * 100}%`, background: getTeamColor(match.team1), transition: 'width 0.4s' }} />
                    <div style={{ width: `${(team2Picks.length / totalPicks) * 100}%`, background: getTeamColor(match.team2), transition: 'width 0.4s' }} />
                  </>
                ) : (
                  <div style={{ width: '100%', background: '#e2e8f0' }} />
                )}
              </div>
            </div>

            {/* All Player Picks — who picked what */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#1a202c', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
                👥 All Picks ({totalPicks} of {profiles.length} players)
              </h3>
              {picks.length === 0 && skippedProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '1rem' }}>
                  No players found.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {/* Players who picked */}
                  {picks.map((pick) => {
                    const isMe = pick.user_id === userId;
                    const name = getName(pick.user_id);
                    const teamColor = getTeamColor(pick.picked_team);
                    const isCorrect = match.status === 'completed' && match.winner !== 'NR' && match.winner === pick.picked_team;
                    const isWrong = match.status === 'completed' && match.winner !== 'NR' && match.winner && match.winner !== pick.picked_team;
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
                        }}
                      >
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
                              <span style={{ background: '#667eea', color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: teamColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            → {pick.picked_team}
                            {isCorrect && <span style={{ color: '#48bb78' }}>✅</span>}
                            {isWrong && <span style={{ color: '#f56565' }}>❌</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Players who SKIPPED */}
                  {skippedProfiles.map((profile) => {
                    const isMe = profile.id === userId;
                    const name = profile.display_name;
                    return (
                      <div
                        key={profile.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: `1px solid ${isMe ? '#667eea40' : '#e2e8f0'}`,
                          borderLeft: '4px solid #e2e8f0',
                          background: isMe ? '#fef5f5' : '#fafafa',
                          opacity: 0.85,
                        }}
                      >
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
                            color: '#a0aec0',
                            background: '#e2e8f0',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#718096',
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
                              <span style={{ background: '#667eea', color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700 }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600 }}>
                            ⛔ Skipped
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
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
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
                null
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
                {totalPickCount > 0 && (
                  <div style={{ color: '#667eea', fontWeight: 600, fontSize: '0.9rem', marginTop: 8 }}>
                    {totalPickCount} pick{totalPickCount !== 1 ? 's' : ''} submitted so far
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