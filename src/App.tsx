import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { RecoilRoot } from 'recoil';

// Lazy loaded pages (ONLY existing files)
const HomePage = lazy(() => import('./pages/HomePage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage'));
const BusPage = lazy(() => import('./pages/BusPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import MainLayout from './layouts/MainLayout';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <RecoilRoot>
      <Router>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-primary-950">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="restaurants" element={<RestaurantsPage />} />
              <Route path="transport" element={<TransportPage />} />
              <Route path="bus" element={<BusPage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="profile" element={<Navigate to="/assistant" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--color-secondary)',
              color: 'var(--color-white)',
              border: '1px solid var(--color-primary-700)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: {
                primary: 'var(--color-accent-500)',
                secondary: 'var(--color-primary-900)',
              },
            },
            error: {
              style: {
                background: 'var(--color-destructive)',
                color: 'var(--color-white)',
              },
            },
          }}
        />
      </Router>
    </RecoilRoot>
  );
}

export default App;
