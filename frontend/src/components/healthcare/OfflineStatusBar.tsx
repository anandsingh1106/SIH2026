import React, { useState, useEffect } from 'react';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export const OfflineStatusBar: React.FC = () => {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    pendingCount: 0,
    isSyncing: false,
  });
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = syncQueueManager.subscribe((s) => setStatus(s));
    return () => unsubscribe();
  }, []);

  const handleSyncNow = async () => {
    setSyncFeedback('Synchronizing records with state servers...');
    const result = await syncQueueManager.processQueue();
    if (result.failed > 0) {
      setSyncFeedback(`Sync completed: ${result.success} updated, ${result.failed} failed.`);
    } else {
      setSyncFeedback(`All records synchronized successfully!`);
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // If online and 0 pending records, keep header clean
  if (status.isOnline && status.pendingCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b shadow-2xs transition-all relative z-20 lg:pl-64 ${
        !status.isOnline
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : 'bg-teal-50 text-teal-900 border-teal-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {!status.isOnline ? (
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
        ) : (
          <Wifi className="w-4 h-4 text-teal-600 shrink-0" />
        )}
        <div>
          <span className="font-bold">
            {!status.isOnline ? 'Offline Mode Active' : 'Network Reconnected'}:
          </span>{' '}
          <span>
            {status.pendingCount > 0
              ? `${status.pendingCount} clinical records saved locally in IndexedDB`
              : 'All records synchronized.'}
          </span>
          {syncFeedback && <span className="ml-2 font-medium italic">({syncFeedback})</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status.pendingCount > 0 && status.isOnline && (
          <Button
            size="sm"
            variant="primary"
            isLoading={status.isSyncing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleSyncNow}
          >
            Sync Now ({status.pendingCount})
          </Button>
        )}
      </div>
    </div>
  );
};
