import { useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import Home from './screens/Home';
import Entry from './screens/Entry';
import Exit from './screens/Exit';
import AdminLogin from './screens/AdminLogin';
import AdminDashboard from './screens/AdminDashboard';
import { useAutoReset } from './hooks/useAutoReset';
import { getToken } from './lib/auth';

/**
 * Kiosk auto-reset: returns to "/" after 7s of inactivity on /entry and /exit only.
 * Disabled on home (no point) and on all /admin/* routes (user-explicit requirement).
 */
function KioskAutoReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const goHome = useCallback(() => navigate('/', { replace: true }), [navigate]);

  const isKioskPath = !location.pathname.startsWith('/admin');
  const isHome = location.pathname === '/';
  const enabled = isKioskPath && !isHome;

  useAutoReset(goHome, enabled, 7000);
  return null;
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <KioskAutoReset />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entry" element={<Entry />} />
        <Route path="/exit" element={<Exit />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdmin>
              <AdminDashboard />
            </ProtectedAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
