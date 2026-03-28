'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Match, Pick } from '@/lib/types';
import { getTeamColor, getTeamFullName } from '@/lib/teams';
import { getMatchPoints } from '@/lib/scoring';

interface Props {
  matches: Match[];
  userPicks: Pick[];
}

function getPickResult(match: Match, pick: Pick | undefined): 'correct' | 'wrong' | 'missed' {
  if (!pick) return 'missed';
  return pick.picked_team === match.winner ? 'correct' : 'wrong';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function MyPicksClient({ matches, userPicks }: Props) {
  const completedMatches = matches.filter((m) => m.status === 'completed');
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming' || m.status === 'live');

  const getUserPick = (matchId: string) => userPicks.find((p) => p.match_id === matchId);

  // Summary calculations
  let correct = 0;
  let wrong = 0;
  let missed = 0;
  let totalPoints = 0;

  completedMatches.forEach((match) => {
    const pick = getUserPick(match.id);
    const result = getPickResult(match, pick);
    const pts = getMatchPoints(match.stage);
    totalPoints += pts[result];
    if (result === 'correct') correct++;
    else if (result === 'wrong') wrong++;
    else missed++;
  });

  const totalPicks = userPicks.length;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          🎯 My Picks
        </h1>

        {/* Summary Card */}
        <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #667eea10, #764ba210)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#667eea' }}>{totalPicks}</div>
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Picks
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#48bb78' }}>{correct}</div>
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>
                Correct
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f56565' }}>{wrong}</div>
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>
                Wrong
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a0aec0' }}>{missed}</div>
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>
                Missed
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#667eea' }}>{totalPoints}</div>
              <div style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>
                Points
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Picks */}
        {upcomingMatches.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Upcoming / Live
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {upcomingMatches.map((match, i) => {
                const pick = getUserPick(match.id);
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
                        borderBottom: i < upcomingMatches.length - 1 ? '1px solid #e2e8f0' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f7fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, minWidth: 64 }}>
                          Match #{match.match_number}
                        </span>
                        <span style={{ fontWeight: 700, color: getTeamColor(match.team1), fontSize: '0.9rem' }}>
                          {match.team1}
                        </span>
                        <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>vs</span>
                        <span style={{ fontWeight: 700, color: getTeamColor(match.team2), fontSize: '0.9rem' }}>
                          {match.team2}
                        </span>
                        <span style={{ color: '#a0aec0', fontSize: '0.75rem', marginLeft: 'auto' }}>
                          {formatDate(match.match_date)}
                        </span>
                      </div>
                      <div style={{ marginLeft: 16, flexShrink: 0 }}>
                        {match.status === 'live' && (
                          <span
                            style={{
                              background: '#f56565',
                              color: '#fff',
                              padding: '3px 10px',
                              borderRadius: 16,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              marginRight: 8,
                            }}
                          >
                            LIVE
                          </span>
                        )}
                        {pick ? (
                          <span
                            style={{
                              background: `${getTeamColor(pick.picked_team)}15`,
                              color: getTeamColor(pick.picked_team),
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                            }}
                          >
                            {pick.picked_team} ✓
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#f7fafc',
                              color: '#a0aec0',
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            Not picked →
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Completed Picks */}
        {completedMatches.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Completed
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {[...completedMatches].reverse().map((match, i) => {
                const pick = getUserPick(match.id);
                const result = getPickResult(match, pick);
                const stgPts = getMatchPoints(match.stage); const points = stgPts[result];
                const loser = match.winner === match.team1 ? match.team2 : match.team1;

                const rowBg =
                  result === 'correct'
                    ? 'rgba(72,187,120,0.04)'
                    : result === 'wrong'
                    ? 'rgba(245,101,101,0.04)'
                    : 'rgba(160,174,192,0.04)';

                const rowBorder =
                  result === 'correct'
                    ? '#48bb78'
                    : result === 'wrong'
                    ? '#f56565'
                    : '#e2e8f0';

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
                        borderBottom: i < completedMatches.length - 1 ? '1px solid #f0f0f0' : 'none',
                        borderLeft: `3px solid ${rowBorder}`,
                        background: rowBg,
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600, minWidth: 56 }}>
                          #{match.match_number}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                          <strong style={{ color: getTeamColor(match.winner!) }}>{match.winner}</strong>
                          {' beat '}
                          <span style={{ color: getTeamColor(loser) }}>{loser}</span>
                        </span>
                        {pick && (
                          <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                            · Picked: <strong style={{ color: getTeamColor(pick.picked_team) }}>{pick.picked_team}</strong>
                          </span>
                        )}
                        {!pick && (
                          <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontStyle: 'italic' }}>
                            · No pick
                          </span>
                        )}
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
                          flexShrink: 0,
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

        {completedMatches.length === 0 && upcomingMatches.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: '#a0aec0', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏏</div>
            <div style={{ fontWeight: 600 }}>No matches yet. Check back when the season starts!</div>
          </div>
        )}
      </main>
    </>
  );
}
