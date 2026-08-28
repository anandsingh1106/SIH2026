import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import { getDB } from '../../services/offline/indexedDbService';
import { SyncOperation } from '../../types';
import { CloudOff, RefreshCw, CheckCircle2, Database, Wifi, AlertTriangle, ArrowUpRight, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const AshaOfflineSyncPage: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStats, setDbStats] = useState({
    patients: 0,
    tasks: 0,
    referrals: 0,
    medicines: 0,
  });

  const loadData = async () => {
    const q = await syncQueueManager.getQueue();
    setQueue(q);
    try {
      const db = await getDB();
      const pCount = await db.count('patients');
      const tCount = await db.count('tasks');
      const rCount = await db.count('referrals');
      const mCount = await db.count('medicines');
      setDbStats({ patients: pCount, tasks: tCount, referrals: rCount, medicines: mCount });
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = syncQueueManager.subscribe((s) => {
      setIsOnline(s.isOnline);
      setIsSyncing(s.isSyncing);
      loadData();
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncQueueManager.processQueue();
    await loadData();
    setIsSyncing(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Offline Sync & Local Database Hub' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <CloudOff className="w-6 h-6 text-teal-600" />
            Offline Data Synchronization & Cache Engine
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Local browser-backed IndexedDB persistence engineered for non-connectivity village operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            isLoading={isSyncing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleManualSync}
          >
            Force Queue Sync
          </Button>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
          isOnline
            ? 'bg-teal-50/70 border-teal-200 text-teal-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isOnline ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white animate-pulse'}`}>
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">
              {isOnline ? 'Device Online (High-Speed LAN/4G Connected)' : 'Device Offline (Field Mode Active)'}
            </h3>
            <p className="text-xs mt-0.5">
              {isOnline
                ? 'All newly created patient visits synchronize in real time.'
                : 'Zero data loss mode active. All forms and records save safely to device memory.'}
            </p>
          </div>
        </div>

        <Badge variant={isOnline ? 'success' : 'warning'} size="md">
          {queue.length} Pending Records Queued
        </Badge>
      </div>

      {/* Cached Tables Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Cached Patients</div>
          <div className="text-2xl font-bold text-ink">{dbStats.patients} Records</div>
          <div className="text-[10px] text-emerald-600 font-bold">✅ Available Offline</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Village Tasks</div>
          <div className="text-2xl font-bold text-ink">{dbStats.tasks} Active</div>
          <div className="text-[10px] text-emerald-600 font-bold">✅ Available Offline</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Tele-Referrals</div>
          <div className="text-2xl font-bold text-ink">{dbStats.referrals} In Grid</div>
          <div className="text-[10px] text-emerald-600 font-bold">✅ Available Offline</div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Essential Drugs</div>
          <div className="text-2xl font-bold text-ink">{dbStats.medicines} Items</div>
          <div className="text-[10px] text-emerald-600 font-bold">✅ Available Offline</div>
        </div>
      </div>

      {/* Pending Sync Queue Table */}
      <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-gov-700" />
            Pending Mutation Queue ({queue.length})
          </h3>
          {queue.length > 0 && (
            <span className="text-xs text-ink-soft font-medium">Auto-retries on reconnection</span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs text-left">
            <thead className="bg-sand-50 text-sand-700 font-semibold border-b border-line">
              <tr>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Record ID</th>
                <th className="p-3">Action</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-ink-soft">
                    All local changes are fully synchronized with the state servers.
                  </td>
                </tr>
              ) : (
                queue.map((op) => (
                  <tr key={op.id} className="hover:bg-sand-50">
                    <td className="p-3 font-bold uppercase text-gov-800">{op.entity}</td>
                    <td className="p-3 font-mono text-ink-muted">{op.entityId}</td>
                    <td className="p-3 capitalize font-semibold">{op.action}</td>
                    <td className="p-3 text-ink-soft">{new Date(op.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3">
                      <Badge variant={op.status === 'synced' ? 'success' : 'warning'} size="sm">
                        {(op.status ?? '').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
