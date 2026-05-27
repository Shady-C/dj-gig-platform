interface Props {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: Props) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '20px 24px',
        flex: 1,
      }}
    >
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: '#fff', letterSpacing: 1 }}>
        {value}
      </div>
    </div>
  );
}
