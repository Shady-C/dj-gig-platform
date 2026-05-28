import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { EventsListPage } from './pages/EventsListPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = typeof token === 'string' && token.trim().length > 0;

  if (!hasHydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'rgba(255,255,255,0.4)' }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventsListPage />} />
            <Route path="/events/:eventId" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/events" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
