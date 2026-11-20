import React, { useState } from 'react';
import { BrandMark } from './components/BrandMark';
import { Layout, type NavKey } from './components/Layout';
import { FeedbackProvider } from './components/ui/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ChurchesPage } from './pages/ChurchesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DistrictPage } from './pages/DistrictPage';
import { FinancePage } from './pages/FinancePage';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';
import { PastorsPage } from './pages/PastorsPage';
import { ReportsPage } from './pages/ReportsPage';

function AppShell() {
  const { user, loading } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard');
  const [focusedChurchId, setFocusedChurchId] = useState<number | null>(null);

  const navigate = (nav: NavKey) => {
    setFocusedChurchId(null);
    setActiveNav(nav);
  };

  const openChurchDetail = (churchId: number) => {
    setFocusedChurchId(churchId);
    setActiveNav('churches');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={42} />
          <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout activeNav={activeNav} onNavigate={navigate}>
      {activeNav === 'dashboard' && (
        <DashboardPage onNavigate={navigate} onOpenChurch={openChurchDetail} />
      )}
      {activeNav === 'district' && <DistrictPage />}
      {activeNav === 'churches' && <ChurchesPage initialChurchId={focusedChurchId} />}
      {activeNav === 'pastors' && <PastorsPage />}
      {activeNav === 'members' && <MembersPage />}
      {activeNav === 'activities' && <ActivitiesPage />}
      {activeNav === 'finance' && <FinancePage />}
      {activeNav === 'reports' && <ReportsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </FeedbackProvider>
  );
}
