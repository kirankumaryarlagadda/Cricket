'use client';

import Navbar from '@/components/Navbar';

export default function RulesClient() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          📋 Rules
        </h1>

        {/* Scoring */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🏏 Scoring System</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#a0aec0', fontWeight: 600 }}>Stage</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', color: '#48bb78', fontWeight: 600 }}>✅ Correct</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', color: '#f56565', fontWeight: 600 }}>❌ Wrong</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', color: '#a0aec0', fontWeight: 600 }}>⛔ Missed</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
                  <td style={{ padding: '10px 12px', color: '#4a5568' }}>🏏 League</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#48bb78', fontWeight: 700, fontSize: '1.1rem' }}>+5</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#f56565', fontWeight: 700, fontSize: '1.1rem' }}>-3</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#a0aec0', fontWeight: 700, fontSize: '1.1rem' }}>-3</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
                  <td style={{ padding: '10px 12px', color: '#4a5568' }}>⚔️ Knockout</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#48bb78', fontWeight: 700, fontSize: '1.1rem' }}>+10</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#f56565', fontWeight: 700, fontSize: '1.1rem' }}>-5</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#a0aec0', fontWeight: 700, fontSize: '1.1rem' }}>-5</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', color: '#4a5568' }}>🏆 Final</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#48bb78', fontWeight: 700, fontSize: '1.1rem' }}>+15</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#f56565', fontWeight: 700, fontSize: '1.1rem' }}>-10</td>
                  <td style={{ textAlign: 'center', padding: '10px 12px', color: '#a0aec0', fontWeight: 700, fontSize: '1.1rem' }}>-10</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tiebreakers */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>⚖️ Ranking Tiebreakers</h3>
          <p style={{ color: '#a0aec0', fontSize: '0.85rem', marginBottom: '1rem' }}>When players have the same points, these tiebreakers are applied in order:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { num: '1', text: 'Total Points', desc: 'Highest points ranks first', icon: '📊' },
              { num: '2', text: 'Correct Picks', desc: 'Most correct picks ranks first', icon: '✅' },
              { num: '3', text: 'Longest Winning Streak', desc: 'Highest streak ranks first', icon: '🔥' },
              { num: '4', text: 'Fewer Wrong Picks', desc: 'Fewer incorrect picks ranks first', icon: '❌' },
              { num: '5', text: 'Fewer Missed Picks', desc: 'Fewer skipped matches ranks first', icon: '⛔' },
              { num: '6', text: 'Still Tied', desc: 'Players share the same rank', icon: '🤝' },
            ].map((rule) => (
              <div key={rule.num} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f7fafc', borderRadius: 10 }}>
                <span style={{ background: '#667eea', color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>{rule.num}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#1a202c', fontSize: '0.9rem' }}>{rule.icon} {rule.text}</span>
                  <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}> — {rule.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How Picks Work */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>📱 How Picks Work</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '⏰', text: 'Picks lock 30 minutes before match start time' },
              { icon: '✏️', text: 'You can change or reset your pick anytime before the deadline' },
              { icon: '🔒', text: 'Picks are hidden from other players until the deadline (30 min before match)' },
              { icon: '👁️', text: 'Once the deadline passes, all picks are revealed — including who skipped' },
              { icon: '⛔', text: 'Not picking before deadline counts as missed (same penalty as wrong pick)' },
              { icon: '🔥', text: 'Consecutive correct picks build your winning streak' },
              { icon: '💔', text: 'A wrong pick OR missed pick breaks your streak' },
              { icon: '🌍', text: 'All times are shown in your local timezone' },
              { icon: '👤', text: 'You can change your Display Name from your Profile (click avatar → Profile)' },
              { icon: '🔒', text: 'Display names are unique — once you use a name, it\'s reserved for you permanently' },
              { icon: '🚫', text: 'No one else can use any of your current or previous display names' },
              { icon: '📅', text: 'You can only change your display name once per day' },
            ].map((rule, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0, width: 30, textAlign: 'center' }}>{rule.icon}</span>
                <span style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.6 }}>{rule.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🏆 Prize Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '🥇', text: '1st Place — Highest ranked player at end of tournament' },
              { icon: '🥈', text: '2nd Place — Second highest ranked player' },
              { icon: '🥉', text: '3rd Place — Third highest ranked player' },
              { icon: '🔥', text: 'Longest Streak — Best winning streak among players outside the Top 3' },
              { icon: '🤝', text: 'If players are tied, the prize is split equally' },
              { icon: '📅', text: 'All prizes are awarded after the final match of the tournament' },
            ].map((rule, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0, width: 30, textAlign: 'center' }}>{rule.icon}</span>
                <span style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.6 }}>{rule.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}