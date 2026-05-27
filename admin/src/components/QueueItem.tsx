import type { ISongRequest } from '../api';

interface Props {
  request: ISongRequest;
  onSetStatus: (reqId: string, status: ISongRequest['status']) => void;
  onDelete: (reqId: string) => void;
}

const statusColors: Record<ISongRequest['status'], string> = {
  pending: 'rgba(255,255,255,0.15)',
  approved: 'rgba(0,200,100,0.25)',
  played: 'rgba(100,100,255,0.25)',
  rejected: 'rgba(255,50,50,0.25)',
};

export function QueueItem({ request, onSetStatus, onDelete }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          background: 'rgba(255,140,0,0.15)',
          border: '1px solid rgba(255,140,0,0.3)',
          borderRadius: 8,
          padding: '6px 10px',
          fontWeight: 700,
          fontSize: 14,
          color: '#ff8c00',
          flexShrink: 0,
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        {request.voteCount}
      </div>

      {request.artworkUrl ? (
        <img src={request.artworkUrl} alt="" width={44} height={44} style={{ borderRadius: 6, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          🎵
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {request.song}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          {request.artist}{request.duration ? ` · ${request.duration}` : ''}
        </div>
        <span
          style={{
            display: 'inline-block',
            marginTop: 4,
            fontSize: 11,
            background: statusColors[request.status],
            padding: '2px 8px',
            borderRadius: 8,
            textTransform: 'capitalize',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {request.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {request.status !== 'approved' && request.status !== 'played' && (
          <button
            onClick={() => onSetStatus(request._id, 'approved')}
            title="Approve"
            style={btnStyle('#00c864')}
          >
            ✓
          </button>
        )}
        {request.status !== 'played' && (
          <button
            onClick={() => onSetStatus(request._id, 'played')}
            title="Mark Played"
            style={btnStyle('#6464ff')}
          >
            ♫
          </button>
        )}
        {request.status !== 'rejected' && (
          <button
            onClick={() => onSetStatus(request._id, 'rejected')}
            title="Reject"
            style={btnStyle('#ff3232')}
          >
            ✕
          </button>
        )}
        <button
          onClick={() => onDelete(request._id)}
          title="Delete"
          style={btnStyle('rgba(255,255,255,0.15)')}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    width: 32,
    height: 32,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'DM Sans, sans-serif',
  };
}
