import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DepartmentPage from './pages/DepartmentPage';
import TeamPage from './pages/TeamPage';
import ManagePage from './pages/ManagePage';
import SeedButton from './components/SeedButton';

export default function App() {
  return (
    <BrowserRouter>
      <SeedButton />
      <Routes>
        <Route path="/" element={<DepartmentPage />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
        <Route path="/team/:teamId/manage" element={<ManagePage />} />
      </Routes>
    </BrowserRouter>
  );
}
