import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAdminEvent } from '../hooks/useAdminEvent';
import { useAdminQueue } from '../hooks/useAdminQueue';
import { useAdminTips } from '../hooks/useAdminTips';
import { QueueItem } from '../components/QueueItem';
import { StatCard } from '../components/StatCard';
import { TipRow } from '../components/TipRow';
import { EventEditor } from '../components/EventEditor';
import { toggleLive } from '../api';
import type { ISongRequest } from '../api';
import { useAuthStore } from '../store/authStore';

const EVENT_ID = import.meta.env.VITE_EVENT_ID as string;
const ACTIVE_EVENT_ID = (window.location.pathname.match(/^\/events\/([^/]+)/)?.[1] ??
  window.location.pathname.match(/^\/admin\/events\/([^/]+)/)?.[1] ??
  EVENT_ID) as string;

type Tab = 'queue' | 'tips' | 'stats' | 'event';
type QueueFilter = ISongRequest['status'] | 'all';

export function DashboardPage() {
  const logout = useAuthStore((s) => s.logout);
  const socket = useSocket(ACTIVE_EVENT_ID);
  const { event, setEvent, loading, error, reload } = useAdminEvent(ACTIVE_EVENT_ID, socket);
  const { requests, setStatus, bulkStatus, remove } = useAdminQueue(ACTIVE_EVENT_ID, socket);
  const { tips, summary } = useAdminTips(ACTIVE_EVENT_ID, socket);
  const [tab, setTab] = useState<Tab>('queue');
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [togglingLive, setTogglingLive] = useState(false);
  const isLive = event?.status === 'live';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'rgba(255,255,255,0.4)' }}>
        Loading...
      </div>
    );
  }

  if (!event) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 42, letterSpacing: 3, margin: '0 0 12px' }}>
            Dashboard Unavailable
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.5, margin: '0 0 20px' }}>
            {error ?? 'Unable to load the dashboard.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={() => void reload()}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                background: '#ff8c00',
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Retry
            </button>
            <button
              onClick={logout}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.75)',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleLive = async () => {
    setTogglingLive(true);
    try {
      const updated = await toggleLive(ACTIVE_EVENT_ID, !isLive);
      setEvent(updated);
    } finally {
      setTogglingLive(false);
    }
  };

  const countByStatus = (s: ISongRequest['status']) => requests.filter((r) => r.status === s).length;
  const pendingCount = countByStatus('pending');
  const filteredRequests = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const filterOptions: { label: string; value: QueueFilter }[] = [
    { label: `All (${requests.length})`, value: 'all' },
    { label: `Pending (${pendingCount})`, value: 'pending' },
    { label: `Approved (${countByStatus('approved')})`, value: 'approved' },
    { label: `Played (${countByStatus('played')})`, value: 'played' },
    { label: `Rejected (${countByStatus('rejected')})`, value: 'rejected' },
  ];

  const tabs: { label: string; value: Tab }[] = [
    { label: 'Queue', value: 'queue' },
    { label: 'Tips', value: 'tips' },
    { label: 'Stats', value: 'stats' },
    { label: 'Event', value: 'event' },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 60px' }}>
      {/* Header */}
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
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2, lineHeight: 1 }}>
            {event.eventName}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{event.djName}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleToggleLive}
            disabled={togglingLive}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 20,
              border: `1px solid ${isLive ? '#ff3b3b' : 'rgba(255,255,255,0.2)'}`,
              background: isLive ? 'rgba(255,59,59,0.15)' : 'transparent',
              color: isLive ? '#ff3b3b' : 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              fontSize: 13,
              cursor: togglingLive ? 'wait' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              letterSpacing: 1,
            }}
          >
            {isLive && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ff3b3b',
                  animation: 'pulse 1.5s infinite',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            )}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
            {isLive ? 'LIVE' : 'GO LIVE'}
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

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px' }}>
        {tabs.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            style={{
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === value ? '#ff8c00' : 'transparent'}`,
              color: tab === value ? '#ff8c00' : 'rgba(255,255,255,0.4)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Queue Tab */}
        {tab === 'queue' && (
          <div>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {filterOptions.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1px solid ${filter === value ? '#ff8c00' : 'rgba(255,255,255,0.15)'}`,
                    background: filter === value ? 'rgba(255,140,0,0.15)' : 'transparent',
                    color: filter === value ? '#ff8c00' : 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bulk actions */}
            {pendingCount > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button
                  onClick={() => bulkStatus('approved', 'pending')}
                  style={{ ...bulkBtnStyle, background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.3)', color: '#00c864' }}
                >
                  ✓ Approve All Pending ({pendingCount})
                </button>
                <button
                  onClick={() => bulkStatus('rejected', 'pending')}
                  style={{ ...bulkBtnStyle, background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', color: '#ff5050' }}
                >
                  ✕ Reject All Pending
                </button>
              </div>
            )}

            {/* Queue list */}
            {filteredRequests.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No requests in this filter.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredRequests.map((req) => (
                  <QueueItem
                    key={req._id}
                    request={req}
                    onSetStatus={setStatus}
                    onDelete={remove}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tips Tab */}
        {tab === 'tips' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <StatCard label="Total Collected" value={`$${(summary.total / 100).toFixed(2)}`} />
              <StatCard label="Avg Tip" value={`$${(summary.average / 100).toFixed(2)}`} />
              <StatCard label="Transactions" value={summary.count} />
            </div>
            {tips.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No tips yet.</p>
            ) : (
              <div>
                {tips.map((tip) => (
                  <TipRow key={tip._id} tip={tip} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <StatCard label="Total Requests" value={requests.length} />
              <StatCard label="Played" value={countByStatus('played')} />
              <StatCard label="Total Tips" value={`$${(summary.total / 100).toFixed(2)}`} />
              <StatCard label="Avg Tip" value={`$${(summary.average / 100).toFixed(2)}`} />
            </div>

            {/* Top 3 songs */}
            <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2, margin: '0 0 12px' }}>
              Top Requested
            </h3>
            {requests.slice(0, 3).map((req, i) => (
              <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: 'rgba(255,255,255,0.2)', width: 28 }}>
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{req.song}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{req.artist} · {req.voteCount} votes</div>
                </div>
              </div>
            ))}

            {/* Stacked progress bar */}
            {requests.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2, margin: '0 0 12px' }}>
                  Queue Breakdown
                </h3>
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
                  {(
                    [
                      { status: 'approved', color: '#00c864' },
                      { status: 'played', color: '#6464ff' },
                      { status: 'pending', color: 'rgba(255,255,255,0.25)' },
                      { status: 'rejected', color: '#ff3232' },
                    ] as const
                  ).map(({ status, color }) => {
                    const count = countByStatus(status);
                    if (count === 0) return null;
                    return (
                      <div
                        key={status}
                        title={`${status}: ${count}`}
                        style={{
                          flex: count,
                          background: color,
                          transition: 'flex 0.3s',
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  {(['approved', 'played', 'pending', 'rejected'] as const).map((s) => (
                    <span key={s} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                      {s}: {countByStatus(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event Tab */}
        {tab === 'event' && (
          <EventEditor event={event} onUpdated={setEvent} />
        )}
      </div>
    </div>
  );
}

const bulkBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
};
