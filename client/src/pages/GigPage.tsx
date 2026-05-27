import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useEvent } from '../hooks/useEvent';
import { useRequests } from '../hooks/useRequests';
import { HeroSection } from '../components/HeroSection';
import { CountdownTimer } from '../components/CountdownTimer';
import { EventDetails } from '../components/EventDetails';
import { MusicSearchPanel } from '../components/MusicSearchPanel';
import { SongRequestQueue } from '../components/SongRequestQueue';
import { TipModal } from '../components/TipModal';

const EVENT_ID = import.meta.env.VITE_EVENT_ID as string;
const EVENT_SLUG = (window.location.pathname.match(/^\/gig\/([^/]+)/)?.[1] ??
  import.meta.env.VITE_EVENT_SLUG ??
  EVENT_ID) as string;

export function GigPage() {
  const socket = useSocket();
  const { event } = useEvent(EVENT_SLUG, socket);
  const { requests, vote, addOrVote } = useRequests(EVENT_SLUG, socket, event?._id);
  const [showTip, setShowTip] = useState(false);
  const isLive = event?.status === 'live';

  if (!event) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 16,
        }}
      >
        Loading event...
      </div>
    );
  }

  return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <HeroSection event={event} />
      <CountdownTimer date={event.date} isLive={isLive} />
      <EventDetails event={event} />
      <MusicSearchPanel
        eventSlug={EVENT_SLUG}
        requests={requests}
        onAdded={addOrVote}
        onVote={vote}
      />
      <SongRequestQueue eventId={event._id} requests={requests} onVote={vote} />

      <button
        onClick={() => isLive && setShowTip(true)}
        disabled={!isLive}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: isLive
            ? 'linear-gradient(135deg, #ff8c00, #ff6000)'
            : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 50,
          color: isLive ? '#fff' : 'rgba(255,255,255,0.3)',
          padding: '14px 24px',
          fontSize: 15,
          fontWeight: 700,
          cursor: isLive ? 'pointer' : 'not-allowed',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: isLive ? '0 0 24px rgba(255,140,0,0.4)' : 'none',
          transition: 'all 0.3s',
          zIndex: 100,
        }}
        title={!isLive ? 'Tipping opens at showtime' : undefined}
      >
        {isLive ? '💸 Tip the DJ' : '🔒 Tipping opens at showtime'}
      </button>

      {showTip && <TipModal eventSlug={EVENT_SLUG} onClose={() => setShowTip(false)} />}
    </div>
  );
}
