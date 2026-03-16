'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Match, Pick, getMatchTimeIST } from '@/lib/types';
import { getTeamColor, getTeamFullName } from '@/lib/teams';
import { getMatchPoints, getScoringTable } from '@/lib/scoring';

interface Props {
  matches: Match[];
  userPicks: Pick[];
  allPicks: { match_id: string; picked_team: string }[];
  userId: string;
}

function getUserPick(userPicks: Pick[], matchId: string): Pick | undefined {
  return userPicks.find((p) => p.match_id === matchId);
}

function getPickDistribution(allPicks: { match_id: string; picked_team: string }[], matchId: string) {
  const matchPicks = allPicks.filter((p) => p.match_id === matchId);
  const total = matchPicks.length;
  if (total === 0) return { total: 0, teams: {} as Record<string, number> };
  const teams: Record<string, number> = {};
  matchPicks.forEach((p) => {
    teams[p.picked_team] = (teams[p.picked_team] || 0) + 1;
  });
  return { total, teams };
}

function getCountdown(matchDate: string): string {
  const deadline = new Date(new Date(matchDate).getTime() - 30 * 60 * 1000);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return '';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
}

function isPickDeadlinePassed(matchDate: string): boolean {
  const deadline = new Date(new Date(matchDate).getTime() - 30 * 60 * 1000);
  return new Date() >= deadline;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getPickResult(match: Match, pick: Pick | undefined): 'correct' | 'wrong' | 'missed' {
  if (!pick) return 'missed';
  return pick.picked_team === match.winner ? 'correct' : 'wrong';
}

export default function MatchesDashboard({ matches, userPicks, allPicks, userId }: Props) {
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [pickingMatch, setPickingMatch] = useState<string | null>(null);
  const [localPicks, setLocalPicks] = useState<Pick[]>(userPicks);
  const [error, setError] = useState<string | null>(null);

  const updateCountdowns = useCallback(() => {
    const cd: Record<string, string> = {};
    matches
      .filter((m) => m.status === 'upcoming')
      .forEach((m) => {
        cd[m.id] = getCountdown(m.match_date);
      });
    setCountdowns(cd);
  }, [matches]);

  useEffect(() => {
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60_000);
    return () => clearInterval(interval);
  }, [updateCountdowns]);

  const handlePick = async (matchId: string, team: string) => {
    setPickingMatch(matchId);
    setError(null);
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, picked_team: team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit pick');
      setLocalPicks((prev) => {
        const filtered = prev.filter((p) => p.match_id !== matchId);
        return [...filtered, data.pick];
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPickingMatch(null);
    }
  };

  const liveMatches = matches.filter((m) => m.status === 'live');
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming');
  const completedMatches = matches.filter((m) => m.status === 'completed').reverse();

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* LIVE MATCHES */}
        {liveMatches.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#1a202c', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Live Matches
            </h2>
            {liveMatches.map((match) => {
              const userPick = getUserPick(localPicks, match.id);
              const dist = getPickDistribution(allPicks, match.id);
              return (
                <Link
                  key={match.id}
                  href={`/match/${match.id}`}
                  style={{ textDecoration: 'none', display: 'block', marginBottom: '1rem' }}
                >
                  <div className="card" style={{ border: '2px solid #f56565', position: 'relative', overflow: 'hidden' }}>
                    {/* Live badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: '#f56565',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        animation: 'pulse 1.5s infinite',
                      }}
                    >
                      LIVE 🔴
                    </div>

                    {/* Stage badge */}
                    {(match.stage === 'qualifier' || match.stage === 'eliminator' || match.stage === 'final') && (
                      <div className="badge badge-gold" style={{ marginBottom: 8 }}>
                        🏆 {match.stage === 'final' ? 'FINAL' : 'KNOCKOUT'}
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: 4 }}>
                      Match #{match.match_number} · {match.venue}
                    </div>

                    {/* Teams VS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '1rem 0' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: getTeamColor(match.team1) }}>
                        {match.team1}
                      </span>
                      <span style={{ fontSize: '1rem', color: '#a0aec0', fontWeight: 600 }}>VS</span>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: getTeamColor(match.team2) }}>
                        {match.team2}
                      </span>
                    </div>

                    {/* User pick */}
                    {userPick && (
                      <div
                        style={{
                          textAlign: 'center',
                          marginBottom: 12,
                          padding: '6px 16px',
                          background: `${getTeamColor(userPick.picked_team)}15`,
                          borderRadius: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          margin: '0 auto 12px',
                          width: 'fit-content',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: getTeamColor(userPick.picked_team), fontSize: '0.85rem' }}>
                          Your Pick: {userPick.picked_team} ✅
                        </span>
                      </div>
                    )}

                    {/* Pick distribution */}
                    {dist.total > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a0aec0', marginBottom: 4 }}>
                          <span>{match.team1} ({dist.teams[match.team1] || 0})</span>
                          <span>{dist.total} picks</span>
                          <span>{match.team2} ({dist.teams[match.team2] || 0})</span>
                        </div>
                        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${((dist.teams[match.team1] || 0) / dist.total) * 100}%`,
                              background: getTeamColor(match.team1),
                              transition: 'width 0.3s',
                            }}
                          />
                          <div
                            style={{
                              width: `${((dist.teams[match.team2] || 0) / dist.total) * 100}%`,
                              background: getTeamColor(match.team2),
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* UPCOMING MATCHES */}
        {upcomingMatches.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#1a202c', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Upcoming Matches
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '1rem',
              }}
            >
              {upcomingMatches.map((match) => {
                const userPick = getUserPick(localPicks, match.id);
                const deadlinePassed = isPickDeadlinePassed(match.match_date);
                const cd = countdowns[match.id];

                return (
                  <div key={match.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#a0aec0', fontWeight: 600 }}>
                        Match #{match.match_number}
                      </span>
                      {(match.stage === 'qualifier' || match.stage === 'eliminator' || match.stage === 'final') && (
                        <span className="badge badge-gold">
                          🏆 {match.stage === 'final' ? 'FINAL' : 'KNOCKOUT'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                      {formatDate(match.match_date)} · {getMatchTimeIST(match.match_date)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{match.venue}</div>

                    {/* Teams */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0.75rem 0' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getTeamColor(match.team1) }}>
                        {match.team1}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 500 }}>vs</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getTeamColor(match.team2) }}>
                        {match.team2}
                      </span>
                    </div>

                    {/* Countdown */}
                    {cd && !deadlinePassed && (
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#667eea', fontWeight: 600 }}>
                        ⏰ Pick closes in {cd}
                      </div>
                    )}

                    {/* Pick buttons or status */}
                    {deadlinePassed ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '10px',
                          background: '#f7fafc',
                          borderRadius: 12,
                          color: '#a0aec0',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        Picks Closed
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[match.team1, match.team2].map((team) => {
                          const isSelected = userPick?.picked_team === team;
                          const otherSelected = userPick && !isSelected;
                          const teamColor = getTeamColor(team);
                          return (
                            <button
                              key={team}
                              disabled={pickingMatch === match.id || !!otherSelected}
                              onClick={() => handlePick(match.id, team)}
                              style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: 12,
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                cursor: otherSelected ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                                border: `2px solid ${teamColor}`,
                                background: isSelected ? teamColor : 'transparent',
                                color: isSelected ? '#fff' : teamColor,
                                opacity: otherSelected ? 0.4 : 1,
                              }}
                            >
                              {isSelected ? `${team} ✓` : team}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <Link
                      href={`/match/${match.id}`}
                      style={{
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: '#667eea',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* COMPLETED MATCHES */}
        {completedMatches.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#1a202c', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Completed Matches
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {completedMatches.map((match, i) => {
                const userPick = getUserPick(localPicks, match.id);
                const result = getPickResult(match, userPick);
                const stagePoints = getMatchPoints(match.stage);
                const points = stagePoints[result];
                const loser = match.winner === match.team1 ? match.team2 : match.team1;

                const badgeStyle: Record<string, { bg: string; color: string; emoji: string }> = {
                  correct: { bg: 'rgba(72,187,120,0.1)', color: '#48bb78', emoji: '✅' },
                  wrong: { bg: 'rgba(245,101,101,0.1)', color: '#f56565', emoji: '❌' },
                  missed: { bg: 'rgba(160,174,192,0.1)', color: '#a0aec0', emoji: '⛔' },
                };
                const bs = badgeStyle[result];

                return (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderBottom: i < completedMatches.length - 1 ? '1px solid #e2e8f0' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f7fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, minWidth: 64 }}>
                          Match #{match.match_number}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                          <strong style={{ color: getTeamColor(match.winner!) }}>{match.winner}</strong>
                          {' beat '}
                          <span style={{ color: getTeamColor(loser) }}>{loser}</span>
                        </span>
                      </div>
                      <div
                        style={{
                          background: bs.bg,
                          color: bs.color,
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {bs.emoji} {points > 0 ? '+' : ''}{points}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* SCORING RULES */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#1a202c', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            📊 Scoring Rules
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {getScoringTable().map((row) => (
              <div
                key={row.stage}
                className="card"
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontWeight: 700, color: '#1a202c', fontSize: '1rem', marginBottom: 12 }}>
                  {row.stage === 'League' ? '🏏' : row.stage === 'Knockout' ? '⚔️' : '🏆'} {row.stage}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: '#48bb78', fontWeight: 700, fontSize: '1.1rem' }}>+{row.correct}</div>
                    <div style={{ color: '#a0aec0', fontSize: '0.75rem' }}>Correct</div>
                  </div>
                  <div>
                    <div style={{ color: '#f56565', fontWeight: 700, fontSize: '1.1rem' }}>{row.wrong}</div>
                    <div style={{ color: '#a0aec0', fontSize: '0.75rem' }}>Wrong</div>
                  </div>
                  <div>
                    <div style={{ color: '#a0aec0', fontWeight: 700, fontSize: '1.1rem' }}>{row.missed}</div>
                    <div style={{ color: '#a0aec0', fontSize: '0.75rem' }}>Missed</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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