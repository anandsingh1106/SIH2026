import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import { dataService } from '../../services/api/dataService';
import { Notification, Priority } from '@arogyasetu/shared/types';
import { Bell, CheckCheck, Filter, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export const NotificationsPage: React.FC = () => {
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  useEffect(() => {
    const load = async () => {
      const list = await dataService.getNotifications(currentRole);
      setNotifications(list);
    };
    load();
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'notifications') load();
    });
    return () => unsub();
  }, [currentRole]);

  const filtered = notifications.filter((n) => {
    const matchCat = selectedCategory === 'All' || n.category === selectedCategory;
    const matchPri = selectedPriority === 'All' || n.priority === selectedPriority;
    return matchCat && matchPri;
  });

  const handleMarkAll = async () => {
    await dataService.markAllNotificationsRead();
  };

  const handleNotificationClick = async (n: Notification) => {
    await dataService.markNotificationRead(n.id);
    if (n.link) navigate(n.link);
  };

  const getPriorityBadge = (p: Priority) => {
    if (p === 'critical') return <Badge variant="critical">CRITICAL</Badge>;
    if (p === 'high') return <Badge variant="danger">HIGH</Badge>;
    if (p === 'moderate') return <Badge variant="warning">MODERATE</Badge>;
    return <Badge variant="primary">NORMAL</Badge>;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Notifications Center' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Bell className="w-6 h-6 text-gov-700" />
            Healthcare Notifications & Priority Alerts
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            System alerts, emergency transfer dispatches, and clinical queue updates
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAll}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-surface p-3 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-1">
          {['All', 'emergency', 'referral', 'medicine', 'system'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-gov-700 text-white font-bold'
                  : 'text-ink-muted hover:bg-sand-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-ink-soft font-semibold">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="border border-sand-300 rounded-lg p-1.5 bg-surface text-xs text-ink focus:outline-none focus:border-gov-600"
          >
            <option value="All">All Tiers</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Risk</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-surface rounded-xl border border-line divide-y divide-line shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-soft">
            No notifications found in this category.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 text-xs transition-colors hover:bg-sand-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !n.isRead ? 'bg-gov-50/30' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-gov-600 shrink-0" />}
                  <h4 className="font-bold text-ink text-sm">{n.title}</h4>
                  {getPriorityBadge(n.priority)}
                </div>
                <p className="text-ink-muted leading-relaxed text-xs">{n.message}</p>
                <div className="text-[11px] text-ink-soft font-medium">
                  {n.timestamp} • Category: <span className="capitalize">{n.category}</span>
                </div>
              </div>

              {n.link && (
                <div className="shrink-0 flex items-center text-xs font-bold text-gov-700 group">
                  <span>Take Action</span>
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
