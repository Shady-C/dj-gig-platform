import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEvents } from '../api';
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

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

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

      <div style={{ padding: '24px 20px' }}>
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
