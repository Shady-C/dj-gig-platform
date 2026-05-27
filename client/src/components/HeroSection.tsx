import { useState } from 'react';
import type { IEvent } from '../api';

interface Props {
  event: IEvent;
}

export function HeroSection({ event }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {event.heroImageUrl && (
        <img
          src={event.heroImageUrl}
          alt={event.eventName}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.45) contrast(1.1) saturate(0.7)',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, #0a0a0a 100%)',
        }}
      />

      {event.status === 'live' && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid #ff3b3b',
            borderRadius: 20,
            padding: '6px 14px',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ff3b3b',
              animation: 'pulse 1.5s infinite',
              display: 'inline-block',
            }}
          />
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ff3b3b', letterSpacing: 1 }}>
            LIVE NOW
          </span>
        </div>
      )}

      <button
        onClick={handleShare}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 20,
          color: '#fff',
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {copied ? '✓ Copied' : 'Share'}
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 24,
          right: 24,
        }}
      >
        <p style={{ margin: 0, color: '#ff8c00', fontSize: 14, fontWeight: 500, letterSpacing: 2 }}>
          {event.djName}
        </p>
        <h1
          style={{
            margin: '4px 0 8px',
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 'clamp(48px, 10vw, 96px)',
            lineHeight: 1,
            letterSpacing: 2,
            color: '#fff',
          }}
        >
          {event.eventName}
        </h1>
        {event.tagline && (
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
            {event.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
