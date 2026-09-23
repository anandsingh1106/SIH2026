import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { OfflineStatusBar } from '../healthcare/OfflineStatusBar';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { useAuth } from '../../services/auth/authContext';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { currentRole } = useAuth();

  return (
    <div className="min-h-screen bg-canvas text-ink-muted flex flex-col antialiased">
      {/* A single soft wash behind the workspace, keyed to the brand blue and
          kept faint — enough to stop the ground reading as flat grey, not
          enough to compete with the risk colours on the cards. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(37,99,235,0.05),transparent)]"
      />

      {/* Offline Status & Sync Alert Bar. Only ASHA workers record visits
          offline in the field, so only they get the sync bar. */}
      {currentRole === 'asha' && <OfflineStatusBar />}

      {/* App Header */}
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex relative">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-20 lg:pb-6">
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {/*
              Keying on the pathname remounts the subtree on every navigation,
              which restarts the entrance animation. Without the key React
              reuses the DOM and the new page simply appears.
            */}
            <div key={location.pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Floating AI Assistant Copilot */}
      <AIAssistantDrawer />
    </div>
  );
};
