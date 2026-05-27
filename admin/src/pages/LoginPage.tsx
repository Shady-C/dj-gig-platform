import { useState } from 'react';
import { login } from '../api';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await login(email, password);
      setToken(token);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 48,
            letterSpacing: 4,
            margin: '0 0 32px',
            textAlign: 'center',
          }}
        >
          DJ Admin
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: '#ff4444', fontSize: 14, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: '#ff8c00',
              color: '#000',
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              marginTop: 4,
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 16,
  padding: '14px 16px',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
};
