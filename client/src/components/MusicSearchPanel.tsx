import { useState, useEffect, useRef, useCallback } from 'react';
import { searchItunes, submitRequest, formatDuration } from '../api';
import type { ISongRequest, ITrack } from '../api';

interface Props {
  eventSlug: string;
  requests: ISongRequest[];
  onAdded: (req: ISongRequest) => void;
  onVote: (reqId: string) => void;
}

export function MusicSearchPanel({ eventSlug, requests, onAdded, onVote }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackStates, setTrackStates] = useState<Record<number, 'idle' | 'added' | 'voted' | 'loading'>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchItunes(query);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 420);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const playPreview = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => null);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) setResults([]);
  };

  const handleRequest = useCallback(
    async (track: ITrack) => {
      const existing = requests.find((r) => r.itunesTrackId === track.trackId);
      if (existing) {
        setTrackStates((s) => ({ ...s, [track.trackId]: 'loading' }));
        await onVote(existing._id);
        setTrackStates((s) => ({ ...s, [track.trackId]: 'voted' }));
        return;
      }

      setTrackStates((s) => ({ ...s, [track.trackId]: 'loading' }));
      try {
        const res = await submitRequest(eventSlug, {
          song: track.trackName,
          artist: track.artistName,
          album: track.collectionName ?? '',
          artworkUrl: track.artworkUrl100 ?? '',
          duration: formatDuration(track.trackTimeMillis ?? 0),
          itunesTrackId: track.trackId,
        });
        onAdded(res.data);
        setTrackStates((s) => ({ ...s, [track.trackId]: 'added' }));
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 409
        ) {
          const conflictReq = (err as { response: { data: ISongRequest } }).response.data;
          onAdded(conflictReq);
          await onVote(conflictReq._id);
          setTrackStates((s) => ({ ...s, [track.trackId]: 'voted' }));
        } else {
          setTrackStates((s) => ({ ...s, [track.trackId]: 'idle' }));
        }
      }
    },
    [eventSlug, requests, onAdded, onVote]
  );

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
        Request a Song
      </h2>

      <input
        type="text"
        placeholder="Search songs, artists..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          color: '#fff',
          fontSize: 16,
          padding: '14px 16px',
          outline: 'none',
          fontFamily: 'DM Sans, sans-serif',
        }}
      />

      {loading && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '12px 0 0' }}>
          Searching...
        </p>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((track) => {
            const state = trackStates[track.trackId] ?? 'idle';
            const inQueue = requests.some((r) => r.itunesTrackId === track.trackId);
            const label =
              state === 'loading'
                ? '...'
                : state === 'added'
                ? '✓ Added'
                : state === 'voted'
                ? '✓ Voted'
                : inQueue
                ? '▲ Vote'
                : '+ Request';

            return (
              <div
                key={track.trackId}
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
                <img
                  src={track.artworkUrl100}
                  alt={track.trackName}
                  width={52}
                  height={52}
                  style={{ borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => track.previewUrl && playPreview(track.previewUrl)}
                />
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
                    {track.trackName}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {track.artistName}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    {track.collectionName} · {formatDuration(track.trackTimeMillis ?? 0)}
                  </div>
                </div>
                <button
                  onClick={() => handleRequest(track)}
                  disabled={state === 'loading' || state === 'added' || state === 'voted'}
                  style={{
                    background: state === 'added' || state === 'voted' ? 'rgba(255,140,0,0.2)' : 'rgba(255,140,0,0.9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: state === 'loading' ? 'wait' : state === 'added' || state === 'voted' ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
