import React from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { VillageHouseholdMap } from '../../components/maps/VillageHouseholdMap';

export const AshaVillageMapPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Village & Household Health Map' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-ink">
          Paud Village Health Grid & Household Geolocation
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          284 Households mapped across 4 Padas (Vetal Pada, Kolvan Road, Wadi Vasti, Gaothan)
        </p>
      </div>

      <VillageHouseholdMap
        villageName="Paud Village (Mulshi Block)"
        onSelectHousehold={(hh) => console.log('Selected household:', hh)}
      />
    </div>
  );
};
