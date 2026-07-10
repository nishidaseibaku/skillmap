import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DepartmentPage from './pages/DepartmentPage';
import TeamPage from './pages/TeamPage';
import ManagePage from './pages/ManagePage';
import MasterSync from './components/MasterSync';
import { AuthProvider } from './auth/AuthContext';
import LoginGate from './auth/LoginGate';
import UserBar from './auth/UserBar';

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <BrowserRouter>
          <UserBar />
          <MasterSync />
          <Routes>
            <Route path="/" element={<DepartmentPage />} />
            <Route path="/team/:teamId" element={<TeamPage />} />
            <Route path="/team/:teamId/manage" element={<ManagePage />} />
          </Routes>
        </BrowserRouter>
      </LoginGate>
    </AuthProvider>
  );
}
