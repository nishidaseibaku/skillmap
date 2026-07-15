import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layout/AppShell';
import DepartmentView from './pages/DepartmentView';
import TeamPage from './pages/TeamPage';
import ManagePage from './pages/ManagePage';
import SettingsPage from './pages/SettingsPage';
import UnassignedView from './pages/UnassignedView';
import { AuthProvider } from './auth/AuthContext';
import LoginGate from './auth/LoginGate';
import UserBar from './auth/UserBar';

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <BrowserRouter>
          <UserBar />
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/settings" replace />} />
              <Route path="/dept/:deptId" element={<DepartmentView />} />
              <Route path="/team/:teamId" element={<TeamPage />} />
              <Route path="/team/:teamId/manage" element={<ManagePage />} />
              <Route path="/unassigned" element={<UnassignedView />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LoginGate>
    </AuthProvider>
  );
}
