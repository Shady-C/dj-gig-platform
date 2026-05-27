import type { ISongRequest } from '../api';

interface Props {
  request: ISongRequest;
  rank: number;
  eventId: string;
  onVote: (reqId: string) => void;
}

export function SongRequestCard({ request, rank, eventId, onVote }: Props) {
  const votedKey = `voted_${eventId}`;
  const voted = JSON.parse(localStorage.getItem(votedKey) ?? '[]') as string[];
  const hasVoted = voted.includes(request._id);

  const handleVote = () => {
    if (hasVoted) return;
    const updated = [...voted, request._id];
    localStorage.setItem(votedKey, JSON.stringify(updated));
    onVote(request._id);
  };

  const statusColors: Record<ISongRequest['status'], string> = {
    pending: 'rgba(255,255,255,0.2)',
    approved: 'rgba(0,200,100,0.3)',
    played: 'rgba(100,100,255,0.3)',
    rejected: 'rgba(255,50,50,0.3)',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', width: 20, textAlign: 'center', flexShrink: 0 }}>
        {rank}
      </span>

      {request.artworkUrl ? (
        <img
          src={request.artworkUrl}
          alt={request.song}
          width={48}
          height={48}
          style={{ borderRadius: 8, flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          🎵
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {request.song}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          {request.artist}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              background: statusColors[request.status],
              padding: '2px 8px',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'capitalize',
            }}
          >
            {request.status}
          </span>
          {request.duration && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{request.duration}</span>
          )}
        </div>
      </div>

      <button
        onClick={handleVote}
        disabled={hasVoted}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: hasVoted ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${hasVoted ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10,
          color: hasVoted ? '#ff8c00' : 'rgba(255,255,255,0.6)',
          padding: '8px 12px',
          cursor: hasVoted ? 'default' : 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          minWidth: 44,
        }}
      >
        <span style={{ fontSize: 16 }}>▲</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{request.voteCount}</span>
      </button>
    </div>
  );
}
