import React, { useState } from 'react';
import { FlaskConical, Download, TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { INITIAL_LAB_ORDERS } from '../../data/mockData';

export const PatientLabReports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const orders = INITIAL_LAB_ORDERS;
  const categories = ['all', ...Array.from(new Set(orders.map(o => o.category)))];

  const filtered = selectedCategory === 'all'
    ? orders
    : orders.filter(o => o.category === selectedCategory);

  const getTrend = (isAbnormal?: boolean) => {
    if (isAbnormal === true) return { icon: <TrendingUp className="w-4 h-4 text-red-500" />, label: 'Abnormal' };
    if (isAbnormal === false) return { icon: <TrendingDown className="w-4 h-4 text-green-500" />, label: 'Normal' };
    return { icon: <Minus className="w-4 h-4 text-ink-soft" />, label: 'Pending' };
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Lab Reports' }]} />

      <div className="flex items-center gap-3">
        <FlaskConical className="w-6 h-6 text-gov-600" />
        <div>
          <h1 className="text-xl font-bold text-ink">Lab Reports</h1>
          <p className="text-sm text-ink-soft">Your diagnostic test results and orders</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Lab results shown here are for informational purposes. Always consult your doctor to interpret results 
          in the context of your clinical condition.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
              selectedCategory === cat
                ? 'bg-gov-600 text-white'
                : 'bg-sand-100 text-ink-muted hover:bg-sand-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((order) => {
          const trend = getTrend(order.isAbnormal);
          const isCompleted = order.status === 'completed';

          return (
            <Card key={order.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-ink">{order.testName}</p>
                    {order.isAbnormal && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {order.category} · {order.doctorName} · {order.facilityName}
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">Ordered: {order.dateOrdered}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge
                    variant={
                      order.status === 'completed' ? 'success'
                        : order.status === 'processing' ? 'warning'
                        : 'info'
                    }
                    className="text-xs capitalize"
                  >
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={order.priority === 'critical' ? 'danger' : order.priority === 'high' ? 'warning' : 'default'} className="text-xs capitalize">
                    {order.priority}
                  </Badge>
                </div>
              </div>

              {isCompleted && order.result && (
                <div className="mt-4 p-4 bg-sand-50 rounded-xl border border-line">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-ink-soft font-medium">Result</p>
                      <p className={`font-bold text-lg mt-0.5 ${order.isAbnormal ? 'text-red-600' : 'text-green-600'}`}>
                        {order.result}
                        {order.unit && <span className="text-sm font-normal text-ink-soft ml-1">{order.unit}</span>}
                      </p>
                    </div>
                    {order.referenceRange && (
                      <div>
                        <p className="text-xs text-ink-soft font-medium">Reference Range</p>
                        <p className="text-sm font-semibold text-sand-700 mt-0.5">{order.referenceRange}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-ink-soft font-medium">Interpretation</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {trend.icon}
                        <span className={`text-sm font-semibold ${order.isAbnormal ? 'text-red-600' : 'text-green-600'}`}>
                          {trend.label}
                        </span>
                      </div>
                    </div>
                    {order.completedDate && (
                      <div>
                        <p className="text-xs text-ink-soft font-medium">Report Date</p>
                        <p className="text-sm font-semibold text-sand-700 mt-0.5">{order.completedDate}</p>
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mt-3 pt-3 border-t border-line">
                      <p className="text-xs text-ink-soft"><span className="font-semibold">Lab Notes: </span>{order.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {order.status !== 'ordered' && (
                <div className="flex gap-2 mt-4">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-gov-50 text-gov-700 text-xs font-semibold rounded-lg border border-gov-200 hover:bg-gov-100 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    Download Report
                  </button>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-ink-soft">
            <FlaskConical className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No lab reports in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientLabReports;

