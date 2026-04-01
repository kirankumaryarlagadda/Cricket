'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Match, MatchStatus, MatchStage, Profile, getMatchTimeLocal } from '@/lib/types';
import { getTeamColor, getAllTeamAbbreviations } from '@/lib/teams';

interface Props {
  matches: Match[];
  profiles: Profile[];
  prizes: { first: number; second: number; third: number; streak: number };
  userId: string;
}

const ALL_TEAMS = getAllTeamAbbreviations();
const STATUSES: MatchStatus[] = ['upcoming', 'live', 'completed'];
const STAGES: MatchStage[] = ['league', 'qualifier', 'eliminator', 'final'];

type TabKey = 'matches' | 'players' | 'settings';

interface EditForm {
  match_date?: string;
  match_hour?: string;
  venue?: string;
  status?: MatchStatus;
  stage?: MatchStage;
}

export default function AdminClient({ matches: initialMatches, profiles: initialProfiles, prizes: initialPrizes, userId }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('matches');
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [settingWinner, setSettingWinner] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncResult, setSyncResult] = useState<string[] | null>(null);
  const [addForm, setAddForm] = useState({
    match_number: '',
    team1: ALL_TEAMS[0],
    team2: ALL_TEAMS[1],
    match_date: '',
    match_hour: '19:30',
    venue: '',
    stage: 'league' as MatchStage,
  });

  // Players state
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);

  // Settings state
  const [prizeForm, setPrizeForm] = useState({
    first: initialPrizes.first,
    second: initialPrizes.second,
    third: initialPrizes.third,
    streak: initialPrizes.streak,
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

  // --- Sync Results from Cricket API ---
  const handleSyncResults = async () => {
    setLoading((p) => ({ ...p, sync: true }));
    setSyncResult(null);
    try {
      const res = await fetch('/api/cron/update-results', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data.summary || ['Sync complete']);
      showMsg('success', 'Results synced successfully!');
      // Refresh page to get updated matches
      window.location.reload();
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, sync: false }));
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

  // --- Approve Player ---
  const handleApprovePlayer = async (userId: string) => {
    setLoading((p) => ({ ...p, [`approve-${userId}`]: true }));
    try {
      const res = await fetch('/api/admin/manage-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve player');
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, is_approved: true } : p))
      );
      showMsg('success', 'Player approved!');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`approve-${userId}`]: false }));
    }
  };

  // --- Reject Player ---
  const handleRejectPlayer = async (userId: string) => {
    setLoading((p) => ({ ...p, [`reject-${userId}`]: true }));
    try {
      const res = await fetch('/api/admin/manage-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject player');
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      showMsg('success', 'Player rejected and removed.');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`reject-${userId}`]: false }));
    }
  };

  const handleRemovePlayer = async (userId: string) => {
    setLoading((p) => ({ ...p, [`remove-${userId}`]: true }));
    try {
      const res = await fetch('/api/admin/manage-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove player');
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      showMsg('success', 'Player removed successfully.');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`remove-${userId}`]: false }));
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    setLoading((p) => ({ ...p, [`admin-${userId}`]: true }));
    try {
      const res = await fetch('/api/admin/manage-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'make-admin', user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to make admin');
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, is_admin: true } : p))
      );
      showMsg('success', 'Player is now an admin!');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`admin-${userId}`]: false }));
    }
  };

  const handleDemoteAdmin = async (userId: string) => {
    setLoading((p) => ({ ...p, [`demote-${userId}`]: true }));
    try {
      const res = await fetch('/api/admin/manage-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demote-admin', user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove admin');
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, is_admin: false } : p))
      );
      showMsg('success', 'Admin access removed.');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`demote-${userId}`]: false }));
    }
  };

  // --- Reset Password ---
  const handleResetPassword = async (targetUserId: string, displayName: string) => {
    setLoading((p) => ({ ...p, [`reset-${targetUserId}`]: true }));
    try {
      const res = await fetch('/api/admin/manage-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', user_id: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      
      // Show the temp password in an alert so admin can share it
      window.alert(
        `✅ Password reset for ${displayName}\n\n` +
        `📧 Email: ${data.email}\n` +
        `🔑 Temporary Password: ${data.temp_password}\n\n` +
        `Share this with the player. They will be asked to set a new password on login.`
      );
      showMsg('success', `Password reset for ${displayName}`);
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, [`reset-${targetUserId}`]: false }));
    }
  };

  // --- Save Prizes ---
  const handleSavePrizes = async () => {
    setLoading((p) => ({ ...p, prizes: true }));
    try {
      const res = await fetch('/api/admin/update-prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first: prizeForm.first,
          second: prizeForm.second,
          third: prizeForm.third,
          streak: prizeForm.streak,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save prizes');
      showMsg('success', 'Prize amounts saved!');
    } catch (e: any) {
      showMsg('error', e.message);
    } finally {
      setLoading((p) => ({ ...p, prizes: false }));
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'matches', label: '🏏 Matches' },
    { key: 'players', label: '👥 Players' },
    { key: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: 800 }}>⚙️ Admin Panel</h1>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid #667eea' : '3px solid transparent',
                background: 'transparent',
                color: activeTab === tab.key ? '#1a202c' : '#a0aec0',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: -2,
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
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

        {/* ==================== MATCHES TAB ==================== */}
        {activeTab === 'matches' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '1rem', gap: 8 }}>
              <button
                onClick={handleSyncResults}
                disabled={loading.sync}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem', background: loading.sync ? '#a0aec0' : '#48bb78' }}
              >
                {loading.sync ? '⏳ Syncing...' : '🔄 Sync Results'}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}
              >
                {showAddForm ? '✕ Cancel' : '+ Add Match'}
              </button>
            </div>

            {/* Sync Results */}
            {syncResult && (
              <div className="card" style={{ marginBottom: '1rem', border: '1px solid #48bb7840', background: '#f0fff4' }}>
                <div style={{ fontWeight: 700, color: '#276749', marginBottom: 8, fontSize: '0.9rem' }}>🔄 Sync Results:</div>
                {syncResult.map((s, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: '#4a5568', padding: '2px 0' }}>• {s}</div>
                ))}
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
                          {match.winner === 'NR' ? (
                          <span className="badge" style={{ background: '#a0aec020', color: '#718096' }}>☔ No Result</span>
                        ) : (
                          <span className="badge badge-gold">🏆 {match.winner}</span>
                        )}
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
                      <span>🕐 {getMatchTimeLocal(match.match_date)}</span>
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
                          <option value="NR">☔ No Result</option>
                        </select>
                        <button
                          onClick={() => handleSetWinner(match.id)}
                          disabled={!settingWinner[match.id] || loading[`winner-${match.id}`]}
                          style={{
                            padding: '6px 16px',
                            border: 'none',
                            borderRadius: 8,
                            background: settingWinner[match.id] ? (settingWinner[match.id] === 'NR' ? '#a0aec0' : '#ecc94b') : '#e2e8f0',
                            color: settingWinner[match.id] ? (settingWinner[match.id] === 'NR' ? '#fff' : '#744210') : '#a0aec0',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: settingWinner[match.id] ? 'pointer' : 'default',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {loading[`winner-${match.id}`] ? '...' : settingWinner[match.id] === 'NR' ? '☔ Set No Result' : '🏆 Set Winner'}
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
          </>
        )}

        {/* ==================== PLAYERS TAB ==================== */}
        {activeTab === 'players' && (
          <>
            <h2 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Player Management ({profiles.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {profiles.map((profile) => {
                const isPending = !profile.is_approved;
                const isAdmin = profile.is_admin;

                return (
                  <div
                    key={profile.id}
                    className="card"
                    style={{
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      borderLeft: `4px solid ${isAdmin ? '#805ad5' : isPending ? '#ecc94b' : '#48bb78'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#1a202c', fontSize: '0.95rem' }}>
                        {profile.display_name}
                      </span>
                      <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>
                        {profile.email}
                      </span>
                      <span style={{ color: '#a0aec0', fontSize: '0.75rem' }}>
                        📅 {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                      {isAdmin && (
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 12,
                            background: '#805ad520',
                            color: '#805ad5',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          Admin
                        </span>
                      )}
                      {!isPending && !isAdmin && (
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 12,
                            background: '#48bb7820',
                            color: '#276749',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        >
                          Approved ✓
                        </span>
                      )}
                      {isPending && !isAdmin && (
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 12,
                            background: '#ecc94b20',
                            color: '#b7791f',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </div>
                    {isPending && !isAdmin && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleApprovePlayer(profile.id)}
                          disabled={loading[`approve-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: 'none',
                            borderRadius: 8,
                            background: '#48bb78',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`approve-${profile.id}`] ? '...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectPlayer(profile.id)}
                          disabled={loading[`reject-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: 'none',
                            borderRadius: 8,
                            background: '#f56565',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`reject-${profile.id}`] ? '...' : '✗ Reject'}
                        </button>
                      </div>
                    )}
                    {!isPending && !isAdmin && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            if (window.confirm(`Reset password for ${profile.display_name}? A temporary password will be generated.`)) {
                              handleResetPassword(profile.id, profile.display_name);
                            }
                          }}
                          disabled={loading[`reset-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: '1.5px solid #dd6b2040',
                            borderRadius: 8,
                            background: 'transparent',
                            color: '#dd6b20',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`reset-${profile.id}`] ? '...' : '🔑 Reset Password'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Make ${profile.display_name} an admin? They will have full access to manage matches, players, and settings.`)) {
                              handleMakeAdmin(profile.id);
                            }
                          }}
                          disabled={loading[`admin-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: '1.5px solid #805ad540',
                            borderRadius: 8,
                            background: 'transparent',
                            color: '#805ad5',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`admin-${profile.id}`] ? '...' : '👑 Make Admin'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${profile.display_name}? This will delete their account and all picks permanently.`)) {
                              handleRemovePlayer(profile.id);
                            }
                          }}
                          disabled={loading[`remove-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: '1.5px solid #f5656540',
                            borderRadius: 8,
                            background: 'transparent',
                            color: '#f56565',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`remove-${profile.id}`] ? '...' : '🗑 Remove'}
                        </button>
                      </div>
                    )}
                    {isAdmin && profile.id !== userId && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            if (window.confirm(`Reset password for ${profile.display_name}? A temporary password will be generated.`)) {
                              handleResetPassword(profile.id, profile.display_name);
                            }
                          }}
                          disabled={loading[`reset-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: '1.5px solid #dd6b2040',
                            borderRadius: 8,
                            background: 'transparent',
                            color: '#dd6b20',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`reset-${profile.id}`] ? '...' : '🔑 Reset Password'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove admin access from ${profile.display_name}? They will remain as an approved player.`)) {
                              handleDemoteAdmin(profile.id);
                            }
                          }}
                          disabled={loading[`demote-${profile.id}`]}
                          style={{
                            padding: '5px 14px',
                            border: '1.5px solid #805ad540',
                            borderRadius: 8,
                            background: 'transparent',
                            color: '#805ad5',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {loading[`demote-${profile.id}`] ? '...' : '📋 Remove Admin'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {profiles.length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: '#a0aec0', padding: '3rem' }}>
                No players found.
              </div>
            )}
          </>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === 'settings' && (
          <>
            <h2 style={{ color: '#1a202c', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Prize Pool Settings
            </h2>

            <div className="card" style={{ maxWidth: 480, border: '2px solid #667eea20' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                    🥇 1st Place
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#4a5568', fontWeight: 600, fontSize: '0.95rem' }}>$</span>
                    <input
                      type="number"
                      value={prizeForm.first}
                      onChange={(e) => setPrizeForm((p) => ({ ...p, first: Number(e.target.value) }))}
                      style={inputStyle}
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                    🥈 2nd Place
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#4a5568', fontWeight: 600, fontSize: '0.95rem' }}>$</span>
                    <input
                      type="number"
                      value={prizeForm.second}
                      onChange={(e) => setPrizeForm((p) => ({ ...p, second: Number(e.target.value) }))}
                      style={inputStyle}
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                    🥉 3rd Place
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#4a5568', fontWeight: 600, fontSize: '0.95rem' }}>$</span>
                    <input
                      type="number"
                      value={prizeForm.third}
                      onChange={(e) => setPrizeForm((p) => ({ ...p, third: Number(e.target.value) }))}
                      style={inputStyle}
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#1a202c', marginBottom: 4 }}>
                    🔥 Longest Streak
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#4a5568', fontWeight: 600, fontSize: '0.95rem' }}>$</span>
                    <input
                      type="number"
                      value={prizeForm.streak}
                      onChange={(e) => setPrizeForm((p) => ({ ...p, streak: Number(e.target.value) }))}
                      style={inputStyle}
                      min={0}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSavePrizes}
                  disabled={loading.prizes}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', fontSize: '0.9rem' }}
                >
                  {loading.prizes ? 'Saving...' : '💾 Save Prizes'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}