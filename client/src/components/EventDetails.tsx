import type { IEvent } from '../api';

interface Props {
  event: IEvent;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatStartTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function EventDetails({ event }: Props) {
  const rows = [
    { icon: '📅', label: formatDate(event.date) },
    { icon: '🕐', label: `${formatStartTime(event.date)} — ${event.endTime}` },
    event.venue && { icon: '📍', label: `${event.venue}${event.address ? ` · ${event.address}` : ''}` },
    event.coverInfo && { icon: '🎟', label: event.coverInfo },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {rows.map(({ icon, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.5 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {event.ticketLink && (
          <a
            href={event.ticketLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              textAlign: 'center',
              background: '#ff8c00',
              color: '#000',
              fontWeight: 700,
              fontSize: 15,
              padding: '14px',
              borderRadius: 12,
              textDecoration: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Get Tickets
          </a>
        )}
        {event.instagramLink && (
          <a
            href={event.instagramLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              fontSize: 22,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            📸
          </a>
        )}
      </div>
    </div>
  );
}
