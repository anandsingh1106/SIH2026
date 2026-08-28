import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Baby, AlertTriangle, CheckCircle2, Heart, Calendar, Phone, ArrowRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const AshaMaternalCarePage: React.FC = () => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedMother, setSelectedMother] = useState<any>(null);

  const [mothers, setMothers] = useState([
    {
      id: 'mat-1',
      name: 'Kavita Sachin Gaikwad',
      age: 24,
      village: 'Paud (Kolvan Rd)',
      lmp: '2026-02-05',
      edd: '2026-11-12',
      gestationalWeeks: 28,
      gravida: 2,
      para: 1,
      hb: 7.8,
      bp: '138/88',
      highRisk: true,
      riskFactors: ['Severe Gestational Anemia (Hb 7.8 g/dL)', 'Elevated BP', 'Pedal Edema'],
      ancCompleted: 2,
      jssyEligible: true,
      referralStatus: 'Referred to Sassoon GMC',
      phone: '+91 97654 32109',
    },
    {
      id: 'mat-2',
      name: 'Pooja Rahul Shinde',
      age: 22,
      village: 'Paud (Vetal Pada)',
      lmp: '2026-04-10',
      edd: '2027-01-15',
      gestationalWeeks: 19,
      gravida: 1,
      para: 0,
      hb: 11.2,
      bp: '118/76',
      highRisk: false,
      riskFactors: [],
      ancCompleted: 2,
      jssyEligible: true,
      referralStatus: 'Routine PHC Care',
      phone: '+91 98221 44556',
    },
    {
      id: 'mat-3',
      name: 'Sneha Santosh More',
      age: 29,
      village: 'Paud (Koliwada)',
      lmp: '2025-11-20',
      edd: '2026-08-27',
      gestationalWeeks: 39,
      gravida: 3,
      para: 2,
      hb: 10.4,
      bp: '124/80',
      highRisk: true,
      riskFactors: ['Previous 2 Lower Segment C-Sections (LSCS)'],
      ancCompleted: 4,
      jssyEligible: true,
      referralStatus: 'Scheduled Institutional Delivery',
      phone: '+91 94220 11223',
    },
  ]);

  const [newReg, setNewReg] = useState({
    name: '',
    age: 23,
    village: 'Paud',
    lmp: '2026-05-01',
    gravida: 1,
    para: 0,
    phone: '',
  });

  const handleRegisterMother = (e: React.FormEvent) => {
    e.preventDefault();
    const lmpDate = new Date(newReg.lmp);
    const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    const eddStr = eddDate.toISOString().substring(0, 10);

    const newM = {
      id: 'mat-' + Date.now(),
      name: newReg.name,
      age: newReg.age,
      village: newReg.village,
      lmp: newReg.lmp,
      edd: eddStr,
      gestationalWeeks: 16,
      gravida: newReg.gravida,
      para: newReg.para,
      hb: 11.0,
      bp: '120/80',
      highRisk: false,
      riskFactors: [],
      ancCompleted: 1,
      jssyEligible: true,
      referralStatus: 'Routine PHC Care',
      phone: newReg.phone,
    };

    setMothers([newM, ...mothers]);
    setIsRegisterOpen(false);
    setNewReg({ name: '', age: 23, village: 'Paud', lmp: '2026-05-01', gravida: 1, para: 0, phone: '' });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Maternal & Child Health Care (ANC / HRP)' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Baby className="w-6 h-6 text-gov-700" />
            Maternal Health (ANC) & High-Risk Pregnancy Ledger
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Monitor Expected Delivery Dates (EDD), 4 ANC milestones, JSSK benefits, and red-flag danger signs
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsRegisterOpen(true)}
        >
          Register Pregnant Mother
        </Button>
      </div>

      {/* Mother Records Grid */}
      <div className="space-y-4">
        {mothers.map((m) => (
          <div
            key={m.id}
            className={`bg-surface rounded-2xl border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
              m.highRisk ? 'border-red-300 bg-red-50/20' : 'border-line'
            }`}
          >
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={m.highRisk ? 'critical' : 'success'} size="sm">
                  {m.highRisk ? 'HIGH RISK PREGNANCY (HRP)' : 'NORMAL GESTATION'}
                </Badge>
                <h3 className="font-bold text-ink text-base">{m.name}</h3>
                <span className="text-xs text-ink-soft font-medium">
                  ({m.age} Yrs • Gravida {m.gravida}, Para {m.para})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-sand-50 p-3 rounded-xl border border-line text-xs">
                <div>
                  <span className="text-[11px] text-ink-soft">Gestation:</span>
                  <div className="font-bold text-gov-800">{m.gestationalWeeks} Weeks</div>
                </div>
                <div>
                  <span className="text-[11px] text-ink-soft">Expected Delivery:</span>
                  <div className="font-bold text-ink">{m.edd}</div>
                </div>
                <div>
                  <span className="text-[11px] text-ink-soft">Hemoglobin:</span>
                  <div className={`font-bold ${m.hb < 8 ? 'text-red-600' : 'text-ink'}`}>
                    {m.hb} g/dL
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-ink-soft">Blood Pressure:</span>
                  <div className="font-bold text-ink">{m.bp} mmHg</div>
                </div>
              </div>

              {/* Risk Factors */}
              {m.riskFactors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> High-Risk Indicators Identified:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.riskFactors.map((rf: string, idx: number) => (
                      <span key={idx} className="text-xs bg-red-100 text-red-800 font-semibold px-2.5 py-0.5 rounded-full border border-red-200">
                        {rf}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ANC Milestones Progress Bar */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-ink-muted">
                  <span>ANC Checkups Completed: {m.ancCompleted} / 4</span>
                  <span className="text-gov-700 font-bold">{m.referralStatus}</span>
                </div>
                <div className="w-full bg-sand-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gov-600 rounded-full"
                    style={{ width: `${(m.ancCompleted / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setSelectedMother(m)}
              >
                Record ANC Visit Details
              </Button>
              <a href={`tel:${m.phone}`}>
                <Button size="sm" variant="outline" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                  Call Mother / Husband
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Register New Pregnancy Modal */}
      {isRegisterOpen && (
        <Modal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          title="Register New Pregnant Mother (MCP Registration)"
          description="Enrolls pregnant mother into tracking schedule with automatic EDD and ANC reminders"
          size="md"
        >
          <form onSubmit={handleRegisterMother} className="space-y-4">
            <Input
              label="Mother Full Name"
              required
              placeholder="e.g. Renuka Deepak Patil"
              value={newReg.name}
              onChange={(e) => setNewReg({ ...newReg, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Age (Years)"
                type="number"
                required
                value={newReg.age}
                onChange={(e) => setNewReg({ ...newReg, age: parseInt(e.target.value) || 20 })}
              />
              <Input
                label="Last Menstrual Period (LMP)"
                type="date"
                required
                value={newReg.lmp}
                onChange={(e) => setNewReg({ ...newReg, lmp: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Gravida (Total Pregnancies)"
                type="number"
                required
                value={newReg.gravida}
                onChange={(e) => setNewReg({ ...newReg, gravida: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Para (Live Births)"
                type="number"
                required
                value={newReg.para}
                onChange={(e) => setNewReg({ ...newReg, para: parseInt(e.target.value) || 0 })}
              />
            </div>
            <Input
              label="Contact Phone"
              required
              placeholder="+91 98000 12345"
              value={newReg.phone}
              onChange={(e) => setNewReg({ ...newReg, phone: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Register & Calculate EDD
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
