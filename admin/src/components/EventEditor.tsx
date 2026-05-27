import { useState } from 'react';
import { updateEvent, uploadHero } from '../api';
import type { IEvent } from '../api';

interface Props {
  event: IEvent;
  onUpdated: (event: IEvent) => void;
}

export function EventEditor({ event, onUpdated }: Props) {
  const [form, setForm] = useState<Partial<IEvent>>({
    djName: event.djName,
    eventName: event.eventName,
    slug: event.slug,
    tagline: event.tagline,
    genre: event.genre,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    venue: event.venue,
    address: event.address,
    coverInfo: event.coverInfo,
    ticketLink: event.ticketLink,
    instagramLink: event.instagramLink,
    heroImageUrl: event.heroImageUrl,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof IEvent, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateEvent(event._id, form);
      onUpdated(updated);
      setToast('Saved!');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Save failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadHero(event._id, file);
      set('heroImageUrl', updated.heroImageUrl);
      onUpdated(updated);
    } catch {
      setToast('Upload failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const fields: { label: string; key: keyof IEvent; type?: string }[] = [
    { label: 'Event Name', key: 'eventName' },
    { label: 'Public Slug', key: 'slug' },
    { label: 'DJ Name', key: 'djName' },
    { label: 'Tagline / Genre / Vibe', key: 'tagline' },
    { label: 'Genre', key: 'genre' },
    { label: 'Date', key: 'date', type: 'datetime-local' },
    { label: 'Start Time', key: 'startTime' },
    { label: 'End Time', key: 'endTime' },
    { label: 'Timezone', key: 'timezone' },
    { label: 'Venue', key: 'venue' },
    { label: 'Address', key: 'address' },
    { label: 'Cover Info', key: 'coverInfo' },
    { label: 'Ticket Link', key: 'ticketLink' },
    { label: 'Instagram Link', key: 'instagramLink' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {form.heroImageUrl && (
        <img
          src={form.heroImageUrl}
          alt="Hero preview"
          style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12 }}
        />
      )}

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
          Hero Image
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handleHeroUpload}
          disabled={uploading}
          style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}
        />
        {uploading && <span style={{ marginLeft: 8, fontSize: 13, color: '#ff8c00' }}>Uploading...</span>}
      </label>

      {fields.map(({ label, key, type }) => (
        <label key={key} style={{ display: 'block' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
            {label}
          </span>
          <input
            type={type ?? 'text'}
            value={(form[key] as string) ?? ''}
            onChange={(e) => set(key, e.target.value)}
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

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '14px',
          borderRadius: 12,
          border: 'none',
          background: '#ff8c00',
          color: '#000',
          fontWeight: 700,
          fontSize: 16,
          cursor: saving ? 'wait' : 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          marginTop: 8,
        }}
      >
        {saving ? 'Saving...' : 'Save Event'}
      </button>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast === 'Saved!' ? '#00c864' : '#ff3232',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 20,
            fontWeight: 600,
            fontSize: 15,
            zIndex: 999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
