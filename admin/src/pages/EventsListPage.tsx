import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEvents, createEvent } from '../api';
import type { IEvent } from '../api';
import { useAuthStore } from '../store/authStore';

const STATUS_COLOR: Record<IEvent['status'], string> = {
  draft: 'rgba(255,255,255,0.3)',
  published: '#4a9eff',
  live: '#00c864',
  ended: 'rgba(255,255,255,0.2)',
};

export function EventsListPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    eventName: '',
    djName: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
  });

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (
      !newForm.eventName.trim() ||
      !newForm.djName.trim() ||
      !newForm.date ||
      !newForm.startTime ||
      !newForm.endTime ||
      !newForm.venue.trim()
    ) {
      setCreateError('Event name, DJ name, date, start time, end time, and venue are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createEvent(newForm);
      navigate(`/events/${created._id}`);
    } catch {
      setCreateError('Failed to create event. Please try again.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'rgba(255,255,255,0.4)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 60px' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 20px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2 }}>
          Your Events
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setShowCreate((v) => !v); setCreateError(null); }}
            style={{
              padding: '10px 14px',
              borderRadius: 20,
              border: `1px solid ${showCreate ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.12)'}`,
              background: showCreate ? 'rgba(255,140,0,0.12)' : 'transparent',
              color: showCreate ? '#ff8c00' : 'rgba(255,255,255,0.75)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            + New Event
          </button>
          <button
            onClick={logout}
            style={{
              padding: '10px 14px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {showCreate && (
          <div
            style={{
              marginBottom: 24,
              padding: '20px',
              borderRadius: 14,
              border: '1px solid rgba(255,140,0,0.25)',
              background: 'rgba(255,140,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 1.5 }}>
              New Event
            </div>
            {(['eventName', 'djName', 'venue'] as const).map((key) => (
              <label key={key} style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  {key === 'eventName' ? 'Event Name' : key === 'djName' ? 'DJ Name' : 'Venue'}
                </span>
                <input
                  type="text"
                  value={newForm[key]}
                  onChange={(e) => setNewForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 15,
                    padding: '12px 14px',
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </label>
            ))}
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                Date
              </span>
              <input
                type="date"
                value={newForm.date}
                onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 15,
                  padding: '12px 14px',
                  outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  colorScheme: 'dark',
                }}
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Start Time
                </span>
                <input
                  type="time"
                  value={newForm.startTime}
                  onChange={(e) => setNewForm((f) => ({ ...f, startTime: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 15,
                    padding: '12px 14px',
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    colorScheme: 'dark',
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  End Time
                </span>
                <input
                  type="time"
                  value={newForm.endTime}
                  onChange={(e) => setNewForm((f) => ({ ...f, endTime: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 15,
                    padding: '12px 14px',
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    colorScheme: 'dark',
                  }}
                />
              </label>
            </div>
            {createError && (
              <p style={{ color: '#ff5050', fontSize: 13, margin: 0 }}>{createError}</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#ff8c00',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: creating ? 'wait' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {creating ? 'Creating...' : 'Create Event'}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                  setNewForm({ eventName: '', djName: '', date: '', startTime: '', endTime: '', venue: '' });
                }}
                disabled={creating}
                style={{
                  padding: '12px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 15,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#ff5050', fontSize: 14, marginBottom: 16 }}>{error}</p>
        )}

        {events.length === 0 && !error ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No events found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((event) => (
              <button
                key={event._id}
                onClick={() => navigate(`/events/${event._id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'DM Sans, sans-serif',
                  width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,140,0,0.4)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, letterSpacing: 1.5, marginBottom: 4 }}>
                    {event.eventName}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {event.djName}{event.venue ? ` · ${event.venue}` : ''}
                    {event.date ? ` · ${new Date(event.date).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: STATUS_COLOR[event.status],
                    flexShrink: 0,
                    marginLeft: 16,
                  }}
                >
                  {event.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
