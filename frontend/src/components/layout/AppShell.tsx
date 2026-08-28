import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { OfflineStatusBar } from '../healthcare/OfflineStatusBar';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-canvas text-ink-muted flex flex-col antialiased">
      {/* Warm ambient wash behind the whole workspace. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(232,135,30,0.10),transparent)]"
      />

      {/* Offline Status & Sync Alert Bar */}
      <OfflineStatusBar />

      {/* App Header */}
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex relative">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-sand-900/50 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
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
