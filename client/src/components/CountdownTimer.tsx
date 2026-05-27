import { useEffect, useState } from 'react';

interface Props {
  date: string;
  isLive: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function CountdownTimer({ date, isLive }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(date));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(date)), 1000);
    return () => clearInterval(id);
  }, [date]);

  if (isLive) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <span
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 'clamp(28px, 6vw, 52px)',
            color: '#ff8c00',
            letterSpacing: 4,
          }}
        >
          🔥 THE NIGHT IS NOW 🔥
        </span>
      </div>
    );
  }

  const units = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HRS', value: timeLeft.hours },
    { label: 'MIN', value: timeLeft.minutes },
    { label: 'SEC', value: timeLeft.seconds },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '40px 24px' }}>
      {units.map(({ label, value }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 'clamp(40px, 8vw, 72px)',
              color: '#fff',
              lineHeight: 1,
            }}
          >
            {pad(value)}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 4 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
