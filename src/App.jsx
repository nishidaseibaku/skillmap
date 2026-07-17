import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { DataProvider, useData } from './data/DataContext';
import LoginGate from './auth/LoginGate';
import AppShell from './layout/AppShell';
import DepartmentPage from './pages/DepartmentPage';
import TeamPage from './pages/TeamPage';
import UnassignedPage from './pages/UnassignedPage';
import SettingsPage from './pages/SettingsPage';

/** トップは最初の部門へ。部門が未同期なら設定（マスタ同期）へ誘導する */
function Home() {
  const { loading, departments } = useData();
  if (loading) return null;
  if (departments.length === 0) return <Navigate to="/settings" replace />;
  return <Navigate to={`/dept/${departments[0].code}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/dept/:deptCode" element={<DepartmentPage />} />
                <Route path="/team/:teamCode" element={<TeamPage />} />
                <Route path="/unassigned" element={<UnassignedPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </LoginGate>
    </AuthProvider>
  );
}
