import type { ITip } from '../api';

interface Props {
  tip: ITip;
}

export function TipRow({ tip }: Props) {
  const amount = `$${(tip.amount / 100).toFixed(2)} ${tip.currency.toUpperCase()}`;
  const date = new Date(tip.createdAt).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 16, color: '#ff8c00' }}>{amount}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{date}</span>
    </div>
  );
}
