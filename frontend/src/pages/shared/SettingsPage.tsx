import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { useI18n } from '../../hooks/useI18n';
import { useToast } from '../../hooks/useToast';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import { getPreferences, setPreferences, playCriticalChime } from '../../utils/preferences';
import { Settings, Globe, Moon, Bell, CloudOff, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const { currentRole } = useAuth();
  const { language, setLanguage } = useI18n();

  const toast = useToast();
  // Kept on this device and applied app-wide, not just while this page is open.
  const [prefs, setPrefs] = useState(getPreferences);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    syncQueueManager.getPendingCount().then(setPendingCount);
    const unsub = syncQueueManager.subscribe((s) => setPendingCount(s.pendingCount));
    return () => unsub();
  }, []);

  const handleSyncNow = async () => {
    setSyncMsg('Synchronizing local IndexedDB records with state servers...');
    const res = await syncQueueManager.processQueue();
    setSyncMsg(`Sync complete! ${res.success} updated, ${res.failed} failed.`);
    setTimeout(() => setSyncMsg(null), 3000);
  };

  const handleClearCache = async () => {
    if (confirm(`Discard ${pendingCount} record(s) that have not reached the server yet? This cannot be undone.`)) {
      await syncQueueManager.clearQueue();
      toast.success('Offline queue cleared');
    }
  };

  const updatePref = (patch: Parameters<typeof setPreferences>[0]) => {
    setPrefs(setPreferences(patch));
    if (patch.criticalChime) playCriticalChime();
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Settings & Offline Configuration' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Settings className="w-6 h-6 text-gov-700" />
          System Settings & Offline Sync Engine
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Configure language preferences, accessibility, notification alerts, and background synchronization intervals
        </p>
      </div>

      {syncMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{syncMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
        {/* 1. Language & Regional Settings */}
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-gov-700" />
            Language & Multilingual Preference
          </h3>

          <p className="text-xs text-ink-soft">
            Select your preferred display and voice audio prescription language:
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { code: 'en' as const, label: 'English', sub: 'Standard' },
              { code: 'mr' as const, label: 'मराठी', sub: 'Marathi' },
              { code: 'hi' as const, label: 'हिंदी', sub: 'Hindi' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  language === lang.code
                    ? 'bg-gov-700 text-white font-bold border-gov-800 shadow-xs'
                    : 'bg-sand-50 text-sand-700 border-line hover:bg-sand-100'
                }`}
              >
                <div className="text-sm font-bold">{lang.label}</div>
                <div className={`text-[10px] ${language === lang.code ? 'text-gov-200' : 'text-ink-soft'}`}>
                  {lang.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Offline Database & Sync Settings */}
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-blue-600" />
            Offline IndexedDB Sync Engine
          </h3>

          <div className="bg-sand-50 p-3 rounded-xl border border-line text-xs space-y-1.5">
            <div className="flex justify-between font-medium text-sand-700">
              <span>Database Engine:</span>
              <span className="font-mono font-bold text-ink">mahaarogya_offline_db (v1)</span>
            </div>
            <div className="flex justify-between font-medium text-sand-700">
              <span>Pending Sync Queue:</span>
              <span className="font-bold text-gov-800">{pendingCount} records</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleSyncNow}
            >
              Force Sync Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
              onClick={handleClearCache}
            >
              Clear Queue
            </Button>
          </div>
        </div>

        {/* 3. Notifications */}
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-gov-700" />
            Notification & Audio Chimes
          </h3>

          <label className="flex items-center justify-between p-3 bg-sand-50 rounded-xl border border-line cursor-pointer text-xs">
            <div>
              <span className="font-bold text-ink block">Critical Alert Chime</span>
              <span className="text-ink-soft">Play a short tone when a critical notification arrives, such as an SOS or emergency referral</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.criticalChime}
              onChange={(e) => updatePref({ criticalChime: e.target.checked })}
              className="rounded text-gov-700 w-4 h-4 focus:ring-gov-500"
            />
          </label>
        </div>

        {/* 4. Accessibility & UI Contrast */}
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
            <Moon className="w-4 h-4 text-gov-700" />
            Accessibility (WCAG 2.1 AA)
          </h3>

          <label className="flex items-center justify-between p-3 bg-sand-50 rounded-xl border border-line cursor-pointer text-xs">
            <div>
              <span className="font-bold text-ink block">High Contrast Typography</span>
              <span className="text-ink-soft">Enhanced border definitions and deep black text contrast</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.highContrast}
              onChange={(e) => updatePref({ highContrast: e.target.checked })}
              className="rounded text-gov-700 w-4 h-4 focus:ring-gov-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
