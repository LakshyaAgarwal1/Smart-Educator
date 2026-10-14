import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginPage } from './pages/LoginPage';
import { PasswordResetRequestPage } from './pages/PasswordResetRequestPage';
import { PasswordResetConfirmPage } from './pages/PasswordResetConfirmPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { GoogleDrivePage } from './pages/GoogleDrivePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { currentPage, isMobileNavOpen, setIsMobileNavOpen, isAuthLoading, user } = useApp();

  // While verifying user session on initial boot
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-white">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-base font-bold font-display tracking-tight">Smart<span className="text-indigo-600">Educator</span></div>
        <div className="text-xs text-gray-400 mt-1">Starting up learning environment...</div>
      </div>
    );
  }

  // Password reset routes
  if (currentPage === 'reset-request') {
    return <PasswordResetRequestPage />;
  }
  if (currentPage === 'reset-confirm') {
    return <PasswordResetConfirmPage />;
  }

  // If unauthenticated or on login page
  if (!user || currentPage === 'login') {
    return <LoginPage />;
  }

  // Authenticated Main Layout (Screens 2 - 9, 12)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Desktop Sidebar (Screens 2, 7) */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar (Screen 12) */}
      {isMobileNavOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-fade-in"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div 
            className="w-64 h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Center Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-hidden relative flex flex-col h-full">
          {currentPage === 'chat' && <DashboardPage />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'doc-detail' && <DocumentDetailPage />}
          {currentPage === 'drive' && <GoogleDrivePage />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
