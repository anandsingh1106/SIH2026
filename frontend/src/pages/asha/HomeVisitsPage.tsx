import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Tabs } from '../../components/ui/Tabs';
import { AshaRecordVisitTab } from './HomeVisits';
import { AshaVisitHistoryTab } from './VisitLog';

/**
 * Home visits, in one place.
 *
 * Recording a visit and reviewing past visits used to be two sidebar entries
 * pointing at two pages — two halves of the same job, and an ASHA worker
 * standing in a courtyard had to know which half she wanted before she could
 * navigate. They are tabs now.
 *
 * The active tab is in the query string so a link can open either one, and so
 * going back returns to the tab the worker was on.
 */
export const AshaHomeVisitsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'history' ? 'history' : 'record');

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    // replace, not push: flipping a tab should not fill the back button with
    // steps the worker has to press through.
    setSearchParams(id === 'record' ? {} : { tab: id }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Home Visits' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Home className="w-6 h-6 text-gov-700" />
          Home Visits
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Record vital signs and danger signs during a household visit, and review what has been
          logged — including visits still waiting to sync.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'record', label: 'Record a visit' },
          { id: 'history', label: 'Visit history' },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === 'record' ? <AshaRecordVisitTab /> : <AshaVisitHistoryTab />}
    </div>
  );
};
