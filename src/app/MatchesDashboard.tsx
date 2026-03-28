'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Match, Pick } from '@/lib/types';
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

function formatDateLocal(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeLocal(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const handleResetPick = async (matchId: string) => {
    setPickingMatch(matchId);
    setError(null);
    try {
      const res = await fetch('/api/picks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset pick');
      setLocalPicks((prev) => prev.filter((p) => p.match_id !== matchId));
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
                      Match #{match.match_number} · <span style={match.venue.includes('DEMO') ? { color: '#f56565', fontWeight: 700 } : {}}>{match.venue}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ color: '#1a202c', fontSize: '1.25rem', fontWeight: 700 }}>
                Upcoming Matches
              </h2>
              <div style={{ display: 'flex', gap: 4, background: '#f0f2f5', borderRadius: 10, padding: 3 }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: viewMode === 'grid' ? '#fff' : 'transparent',
                    color: viewMode === 'grid' ? '#667eea' : '#a0aec0',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  ▦ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: viewMode === 'list' ? '#fff' : 'transparent',
                    color: viewMode === 'list' ? '#667eea' : '#a0aec0',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  ☰ List
                </button>
              </div>
            </div>
            {/* GRID VIEW */}
            <div
              style={{
                display: viewMode === 'grid' ? 'grid' : 'none',
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
                      {formatDateLocal(match.match_date)} · {formatTimeLocal(match.match_date)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: match.venue.includes('DEMO') ? '#f56565' : '#a0aec0', fontWeight: match.venue.includes('DEMO') ? 700 : 400, background: match.venue.includes('DEMO') ? '#fff5f5' : 'transparent', padding: match.venue.includes('DEMO') ? '4px 10px' : 0, borderRadius: 8, border: match.venue.includes('DEMO') ? '1px dashed #f56565' : 'none' }}>{match.venue}</div>

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
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                          {[match.team1, match.team2].map((team) => {
                            const isSelected = userPick?.picked_team === team;
                            const teamColor = getTeamColor(team);
                            return (
                              <button
                                key={team}
                                disabled={pickingMatch === match.id}
                                onClick={() => handlePick(match.id, team)}
                                style={{
                                  flex: 1,
                                  padding: '10px 0',
                                  borderRadius: 12,
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  border: `2px solid ${teamColor}`,
                                  background: isSelected ? teamColor : 'transparent',
                                  color: isSelected ? '#fff' : teamColor,
                                  opacity: 1,
                                }}
                              >
                                {isSelected ? `${team} ✓` : team}
                              </button>
                            );
                          })}
                        </div>
                        {userPick && (
                          <button
                            disabled={pickingMatch === match.id}
                            onClick={() => handleResetPick(match.id)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 12,
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: '1.5px solid #e2e8f0',
                              background: 'transparent',
                              color: '#a0aec0',
                            }}
                            title="Reset pick — decide later"
                          >
                            ↩ Reset
                          </button>
                        )}
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

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {upcomingMatches.map((match, i) => {
                  const userPick = getUserPick(localPicks, match.id);
                  const deadlinePassed = isPickDeadlinePassed(match.match_date);
                  const cd = countdowns[match.id];

                  return (
                    <div
                      key={match.id}
                      style={{
                        padding: '14px 16px',
                        borderBottom: i < upcomingMatches.length - 1 ? '1px solid #e2e8f0' : 'none',
                        background: match.venue.includes('DEMO') ? '#fff5f5' : 'transparent',
                      }}
                    >
                      {/* Row 1: Match number + Teams + Date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.7rem', color: '#a0aec0', fontWeight: 600 }}>
                            #{match.match_number}
                          </span>
                          <span style={{ fontWeight: 800, color: getTeamColor(match.team1), fontSize: '0.95rem' }}>
                            {match.team1}
                          </span>
                          <span style={{ color: '#a0aec0', fontSize: '0.7rem' }}>vs</span>
                          <span style={{ fontWeight: 800, color: getTeamColor(match.team2), fontSize: '0.95rem' }}>
                            {match.team2}
                          </span>
                        </div>
                        {cd && !deadlinePassed && (
                          <span style={{ color: '#667eea', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            ⏰ {cd}
                          </span>
                        )}
                      </div>

                      {/* Row 2: Date/time + Pick buttons */}
                      {/* Row 2: Date/time + Venue */}
                      <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginBottom: 8 }}>
                        {formatDateLocal(match.match_date)} · {formatTimeLocal(match.match_date)} · <span style={match.venue.includes('DEMO') ? { color: '#f56565', fontWeight: 700 } : {}}>{match.venue}</span>
                      </div>

                      {/* Row 3: Pick buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                        {deadlinePassed ? (
                          <span style={{ color: '#a0aec0', fontSize: '0.75rem', fontWeight: 600 }}>Closed</span>
                        ) : userPick ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                background: `${getTeamColor(userPick.picked_team)}15`,
                                color: getTeamColor(userPick.picked_team),
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                              }}
                            >
                              {userPick.picked_team} ✓
                            </span>
                            <button
                              disabled={pickingMatch === match.id}
                              onClick={() => handleResetPick(match.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                background: 'transparent',
                                color: '#a0aec0',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                              }}
                            >
                              ↩
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[match.team1, match.team2].map((team) => (
                              <button
                                key={team}
                                disabled={pickingMatch === match.id}
                                onClick={() => handlePick(match.id, team)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  border: `1.5px solid ${getTeamColor(team)}`,
                                  background: 'transparent',
                                  color: getTeamColor(team),
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                }}
                              >
                                {team}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* View Details link */}
                      <div style={{ marginTop: 6, textAlign: 'right' }}>
                        <Link
                          href={`/match/${match.id}`}
                          style={{
                            fontSize: '0.75rem',
                            color: '#667eea',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
