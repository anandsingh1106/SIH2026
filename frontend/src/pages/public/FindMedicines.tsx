import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/api/dataService';
import { Medicine } from '../../types';
import { MAHARASHTRA_DISTRICTS } from '../../data/mockData';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Pill, CheckCircle2, AlertTriangle, XCircle, Building2, ShieldAlert } from 'lucide-react';

export const FindMedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    dataService.getMedicines().then(setMedicines);
  }, []);

  const categories = Array.from(new Set(medicines.map((m) => m.category)));

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.facilityName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDistrict = selectedDistrict === 'All' || m.district === selectedDistrict;
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;

    return matchesSearch && matchesDistrict && matchesCat;
  });

  const getStockBadge = (stock: number, minThreshold: number) => {
    if (stock <= 0) {
      return <Badge variant="danger">Out of Stock</Badge>;
    }
    if (stock < minThreshold) {
      return <Badge variant="warning">Low Stock ({stock} Units)</Badge>;
    }
    return <Badge variant="success">Available ({stock} Units)</Badge>;
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-2.5">
            <Pill className="w-7 h-7 text-gov-700" />
            Maharashtra Essential Medicine Availability & Stock Discovery
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Check real-time stock levels of free essential medications across government hospital pharmacies and rural PHCs.
          </p>
        </div>

        {/* Clinical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Public Health Notice:</strong> All essential drugs at Government of Maharashtra health institutions are provided <strong>100% free of charge</strong> under the National Health Mission. Prescription from a registered medical officer is required for dispensing.
          </span>
        </div>

        {/* Search & Filters */}
        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <SearchInput
                placeholder="Search Paracetamol, Metformin, Amlodipine..."
                onChange={setSearchQuery}
              />
            </div>

            <div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
              >
                <option value="All">All Districts</option>
                {MAHARASHTRA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d} District
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
              >
                <option value="All">All Therapeutic Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-sand-50 text-sand-700 font-semibold border-b border-line">
                <tr>
                  <th className="p-3.5">Medicine & Generic Formulation</th>
                  <th className="p-3.5">Therapeutic Category</th>
                  <th className="p-3.5">Dosage / Unit</th>
                  <th className="p-3.5">Stock Status</th>
                  <th className="p-3.5">Dispensing Facility</th>
                  <th className="p-3.5">Batch / Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-ink-soft">
                      No medicines found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((med) => (
                    <tr key={med.id} className="hover:bg-sand-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-ink text-sm">{med.name}</div>
                        <div className="text-[11px] text-ink-soft font-mono mt-0.5">{med.genericName}</div>
                      </td>
                      <td className="p-3.5 text-ink-muted font-medium">{med.category}</td>
                      <td className="p-3.5 font-bold text-gov-800">{med.dosage}</td>
                      <td className="p-3.5">{getStockBadge(med.stock, med.minThreshold)}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-ink flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-ink-soft" />
                          {med.facilityName}
                        </div>
                        <div className="text-[10px] text-ink-soft">{med.district} District</div>
                      </td>
                      <td className="p-3.5 text-[11px] text-ink-soft">
                        <div>Batch: <span className="font-mono font-semibold text-sand-700">{med.batchNumber}</span></div>
                        <div>Exp: {med.expiryDate}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
