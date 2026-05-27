import type { ISongRequest } from '../api';
import { SongRequestCard } from './SongRequestCard';

interface Props {
  eventId: string;
  requests: ISongRequest[];
  onVote: (reqId: string) => void;
}

export function SongRequestQueue({ eventId, requests, onVote }: Props) {
  if (requests.length === 0) {
    return (
      <div style={{ padding: '0 24px 32px' }}>
        <h2
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 28,
            letterSpacing: 2,
            margin: '0 0 16px',
            color: '#fff',
          }}
        >
          Song Queue
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          No requests yet — be the first!
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <h2
        style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 28,
          letterSpacing: 2,
          margin: '0 0 16px',
          color: '#fff',
        }}
      >
        Song Queue
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {requests.map((req, i) => (
          <SongRequestCard
            key={req._id}
            request={req}
            rank={i + 1}
            eventId={eventId}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  );
}
