'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Match, MatchStatus, MatchStage, getMatchTimeIST } from '@/lib/types';
import { getTeamColor, getAllTeamAbbreviations } from '@/lib/teams';

interface Props {
  matches: Match[];
}

const ALL_TEAMS = getAllTeamAbbreviations();
const STATUSES: MatchStatus[] = ['upcoming', 'live', 'completed'];
const STAGES: MatchStage[] = ['league', 'qualifier', 'eliminator', 'final'];

interface EditForm {
  match_date?: string;
  match_hour?: string;
  venue?: string;
  status?: MatchStatus;
  stage?: MatchStage;
}

export default function AdminClient({ matches: initialMatches }: Props) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [settingWinner, setSettingWinner] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    match_number: '',
    team1: ALL_TEAMS[0],
    team2: ALL_TEAMS[1],
    match_date: '',
    match_hour: '19:30',
    venue: '',
    stage: 'league' as MatchStage,
  });

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // --- Edit Match ---
  const startEdit = (match: Match) => {
    setEditingId(match.id);
    // Extract HH:mm in IST from match_date
    const d = new Date(match.match_date);
    const istParts = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
    // toLocaleTimeString with hour12:false may return e.g. "19:30", normalize to HH:mm
    const matchHour = istParts.replace(/[^\d:]/g, '').slice(0, 5);
    setEditForm({
      match_date: match.match_date?.split('T')[0] ?? '',
      match_hour: matchHour,
      venue: match.venue,
      status: match.status,
      stage: match.stage,
    } as EditForm);
  };

  const saveEdit = async (matchId: string) => {
    setLoading((p) => ({ ...p, [`edit-${matchId}`]: true }));
    try {
      // Combine date and time into a single ISO string with IST offset
      const { match_hour, ...restEditForm } = editForm;
      const combinedMatchDate = restEditForm.match_date && match_hour
        ? `${restEditForm.match_date}T${match_hour}:00+05:30`
        : restEditForm.match_date;
      const payload = { ...restEditForm, match_date: combinedMatchDate };
      const res = await fetch('/api/admin/update-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update match');
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, match_date: combinedMatchDate || m.match_date, venue: restEditForm.venue || m.venue, status: restEditForm.status || m.status, stage: restEditForm.stage || m.stage } : m))
      );
      setEditingId(null);
      showMsg('success', 'Match updated successfully!');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`edit-${matchId}`]: false }));
    }
  };

  // --- Set Winner ---
  const handleSetWinner = async (matchId: string) => {
    const winner = settingWinner[matchId];
    if (!winner) return;
    setLoading((p) => ({ ...p, [`winner-${matchId}`]: true }));
    try {
      const res = await fetch('/api/admin/set-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, winner }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set winner');
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, winner, status: 'completed' as MatchStatus } : m
        )
      );
      showMsg('success', `Winner set to ${winner}!`);
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`winner-${matchId}`]: false }));
    }
  };

  // --- Add Match ---
  const handleAddMatch = async () => {
    if (!addForm.match_number || !addForm.team1 || !addForm.team2 || !addForm.match_date || !addForm.venue) {
      showMsg('error', 'Please fill all required fields');
      return;
    }
    setLoading((p) => ({ ...p, add: true }));
    try {
      const combinedDate = `${addForm.match_date}T${addForm.match_hour}:00+05:30`;
      const res = await fetch('/api/admin/add-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_number: parseInt(addForm.match_number),
          team1: addForm.team1,
          team2: addForm.team2,
          match_date: combinedDate,
          venue: addForm.venue,
          stage: addForm.stage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add match');
      setMatches((prev) => [...prev, data.match].sort((a: Match, b: Match) => a.match_number - b.match_number));
      setAddForm({ match_number: '', team1: ALL_TEAMS[0], team2: ALL_TEAMS[1], match_date: '', match_hour: '19:30', venue: '', stage: 'league' });
      setShowAddForm(false);
      showMsg('success', 'Match added successfully!');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, add: false }));
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    color: '#1a202c',
    background: '#fff',
    outline: 'none',
    width: '100%',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800 }}>⚙️ Admin Panel</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Match'}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={message.type === 'success' ? 'success-message' : 'error-message'}
            style={{ marginBottom: '1rem' }}
          >
            {message.text}
          </div>
        )}

        {/* Add Match Form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #667eea30' }}>
            <h3 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              ➕ Add New Match
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Match Number *
                </label>
                <input
                  type="number"
                  value={addForm.match_number}
                  onChange={(e) => setAddForm((p) => ({ ...p, match_number: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. 71"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Team 1 *
                </label>
                <select
                  value={addForm.team1}
                  onChange={(e) => setAddForm((p) => ({ ...p, team1: e.target.value }))}
                  style={selectStyle}
                >
                  {ALL_TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Team 2 *
                </label>
                <select
                  value={addForm.team2}
                  onChange={(e) => setAddForm((p) => ({ ...p, team2: e.target.value }))}
                  style={selectStyle}
                >
                  {ALL_TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Date *
                </label>
                <input
                  type="date"
                  value={addForm.match_date}
                  onChange={(e) => setAddForm((p) => ({ ...p, match_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Time
                </label>
                <input
                  type="time"
                  value={addForm.match_hour}
                  onChange={(e) => setAddForm((p) => ({ ...p, match_hour: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Venue *
                </label>
                <input
                  type="text"
                  value={addForm.venue}
                  onChange={(e) => setAddForm((p) => ({ ...p, venue: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. Wankhede Stadium, Mumbai"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                  Stage
                </label>
                <select
                  value={addForm.stage}
                  onChange={(e) => setAddForm((p) => ({ ...p, stage: e.target.value as MatchStage }))}
                  style={selectStyle}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleAddMatch}
                disabled={loading.add}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 24px', fontSize: '0.9rem' }}
              >
                {loading.add ? 'Adding...' : '✓ Add Match'}
              </button>
            </div>
          </div>
        )}

        {/* Match Management */}
        <h2 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
          Match Management ({matches.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {matches.map((match) => {
            const isEditing = editingId === match.id;

            return (
              <div
                key={match.id}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  borderLeft: `4px solid ${
                    match.status === 'completed'
                      ? '#48bb78'
                      : match.status === 'live'
                      ? '#f56565'
                      : '#667eea'
                  }`,
                }}
              >
                {/* Match header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600 }}>
                      #{match.match_number}
                    </span>
                    <span style={{ fontWeight: 800, color: getTeamColor(match.team1), fontSize: '1.1rem' }}>
                      {match.team1}
                    </span>
                    <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>vs</span>
                    <span style={{ fontWeight: 800, color: getTeamColor(match.team2), fontSize: '1.1rem' }}>
                      {match.team2}
                    </span>
                    <span
                      className={`badge ${
                        match.status === 'completed'
                          ? 'badge-success'
                          : match.status === 'live'
                          ? 'badge-error'
                          : 'badge-muted'
                      }`}
                    >
                      {match.status.toUpperCase()}
                    </span>
                    {match.winner && (
                      <span className="badge badge-gold">🏆 {match.winner}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isEditing ? (
                      <button
                        onClick={() => startEdit(match)}
                        style={{
                          padding: '6px 14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          background: '#fff',
                          color: '#667eea',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => saveEdit(match.id)}
                          disabled={loading[`edit-${match.id}`]}
                          style={{
                            padding: '6px 14px',
                            border: 'none',
                            borderRadius: 8,
                            background: '#48bb78',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`edit-${match.id}`] ? '...' : '✓ Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: '6px 14px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            background: '#fff',
                            color: '#a0aec0',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Match info row */}
                <div style={{ display: 'flex', gap: 16, color: '#a0aec0', fontSize: '0.8rem', marginTop: 6, flexWrap: 'wrap' }}>
                  <span>📅 {match.match_date?.split('T')[0]}</span>
                  <span>🕐 {getMatchTimeIST(match.match_date)}</span>
                  <span>📍 {match.venue}</span>
                  <span>🏷️ {match.stage}</span>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: '#f7fafc',
                      borderRadius: 12,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4a5568', marginBottom: 3 }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={(editForm.match_date ?? '').split('T')[0]}
                        onChange={(e) => setEditForm((p) => ({ ...p, match_date: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4a5568', marginBottom: 3 }}>
                        Time
                      </label>
                      <input
                        type="time"
                        value={editForm.match_hour ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, match_hour: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4a5568', marginBottom: 3 }}>
                        Venue
                      </label>
                      <input
                        type="text"
                        value={editForm.venue ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, venue: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4a5568', marginBottom: 3 }}>
                        Status
                      </label>
                      <select
                        value={editForm.status ?? 'upcoming'}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as MatchStatus }))}
                        style={selectStyle}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4a5568', marginBottom: 3 }}>
                        Stage
                      </label>
                      <select
                        value={editForm.stage ?? 'league'}
                        onChange={(e) => setEditForm((p) => ({ ...p, stage: e.target.value as MatchStage }))}
                        style={selectStyle}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Set Winner row */}
                {match.status !== 'completed' && (
                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      background: '#fefce8',
                      borderRadius: 10,
                      border: '1px solid #ecc94b40',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b7791f', whiteSpace: 'nowrap' }}>
                      Set Winner:
                    </span>
                    <select
                      value={settingWinner[match.id] ?? ''}
                      onChange={(e) =>
                        setSettingWinner((p) => ({ ...p, [match.id]: e.target.value }))
                      }
                      style={{ ...selectStyle, maxWidth: 120 }}
                    >
                      <option value="">Select...</option>
                      <option value={match.team1}>{match.team1}</option>
                      <option value={match.team2}>{match.team2}</option>
                    </select>
                    <button
                      onClick={() => handleSetWinner(match.id)}
                      disabled={!settingWinner[match.id] || loading[`winner-${match.id}`]}
                      style={{
                        padding: '6px 16px',
                        border: 'none',
                        borderRadius: 8,
                        background: settingWinner[match.id] ? '#ecc94b' : '#e2e8f0',
                        color: settingWinner[match.id] ? '#744210' : '#a0aec0',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: settingWinner[match.id] ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {loading[`winner-${match.id}`] ? '...' : '🏆 Set Winner'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {matches.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: '#a0aec0', padding: '3rem' }}>
            No matches found. Use the Add Match button to create matches.
          </div>
        )}
      </main>
    </>
  );
}