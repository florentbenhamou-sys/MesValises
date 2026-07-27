import { Navigate, Route, Routes } from 'react-router-dom';
import { useHousehold } from './context/HouseholdContext';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import People from './pages/People';
import TripDetail from './pages/TripDetail';

function RequireHousehold({ children }: { children: React.ReactNode }) {
  const { ready, household, configured } = useHousehold();
  if (!ready) return <div className="loading-screen">Chargement…</div>;
  if (!configured || !household) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        element={
          <RequireHousehold>
            <Layout />
          </RequireHousehold>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/people" element={<People />} />
        <Route path="/trip/:tripId" element={<TripDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
