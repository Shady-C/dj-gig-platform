import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const token = useAuthStore((s) => s.token);
  return token ? <DashboardPage /> : <LoginPage />;
}

export default App;
