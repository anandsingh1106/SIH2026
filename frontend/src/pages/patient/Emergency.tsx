import React, { useState } from 'react';
import { PhoneCall, AlertOctagon, HeartHandshake, ShieldAlert, MapPin, Share2, UserCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { INITIAL_PATIENTS } from '../../data/mockData';

export const PatientEmergency: React.FC = () => {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [gpsShared, setGpsShared] = useState(false);

  const patient = INITIAL_PATIENTS[0];

  const handleSos = () => {
    setSosTriggered(true);
    setGpsShared(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Emergency & SOS' }]} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Emergency & 108 SOS Response</h1>
          <p className="text-sm text-ink-soft">Immediate distress beacon, emergency medical card, and emergency contacts</p>
        </div>
      </div>

      {/* SOS Giant Trigger Button */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-rose-500 to-red-700 text-white text-center rounded-2xl shadow-lg border-0">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Maharashtra Emergency Medical Services
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold">Need Immediate Medical Assistance?</h2>
          <p className="text-sm text-rose-100">
            Pressing the SOS button instantly dispatches your live GPS coordinates, critical health summary (Allergies, Blood Group: {patient.bloodGroup}), and alerts your nearest PHC and emergency contacts.
          </p>

          {!sosTriggered ? (
            <button
              onClick={handleSos}
              className="mt-4 px-8 py-5 bg-surface text-red-700 font-extrabold text-xl rounded-2xl shadow-2xl hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto border-4 border-rose-200 animate-pulse"
            >
              <PhoneCall className="w-6 h-6" />
              TRIGGER 108 AMBULANCE SOS
            </button>
          ) : (
            <div className="mt-4 p-4 bg-white/10 backdrop-blur rounded-xl border border-white/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" /> SOS Active — Emergency Response Dispatched
              </div>
              <p className="text-xs text-white/90">
                108 Emergency Control Center in Pune has acknowledged your beacon. Nearest ambulance: <strong>MH-12-EM-9921 (ETA 12 mins)</strong>.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <MapPin className="w-4 h-4" /> GPS: 18.5304° N, 73.5356° E (Paud, Mulshi) transmitted.
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-4 text-xs text-rose-100 flex-wrap">
            <span>Direct Helplines:</span>
            <a href="tel:108" className="underline font-bold hover:text-white">Ambulance: 108</a>
            <span>•</span>
            <a href="tel:104" className="underline font-bold hover:text-white">Health Advice: 104</a>
            <span>•</span>
            <a href="tel:112" className="underline font-bold hover:text-white">National Emergency: 112</a>
          </div>
        </div>
      </Card>

      {/* Emergency Medical ID Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger">
        <Card className="p-5 border-l-4 border-l-rose-500 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-sm">Emergency Medical Card</h3>
            <Badge variant="danger">High Priority</Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-ink-soft">Full Name</span>
              <p className="font-bold text-ink">{patient.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-ink-soft">Blood Group</span>
                <p className="font-extrabold text-rose-600 text-base">{patient.bloodGroup || 'O +ve'}</p>
              </div>
              <div>
                <span className="text-xs text-ink-soft">Age / Gender</span>
                <p className="font-semibold text-ink">{patient.age} yrs / {patient.gender}</p>
              </div>
            </div>

            <div>
              <span className="text-xs text-ink-soft">Known Allergies</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded border border-rose-200">
                      {a}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink-soft">No documented drug allergies</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-ink-soft">Chronic Conditions</span>
              <p className="text-xs font-semibold text-sand-700 mt-0.5">
                {patient.chronicConditions?.join(', ') || 'Hypertension, Type 2 Diabetes'}
              </p>
            </div>
          </div>
        </Card>

        {/* Emergency Contacts */}
        <Card className="p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-sm">Designated Emergency Contacts & Caregivers</h3>
            <button className="text-xs text-gov-600 font-semibold hover:underline">Edit Contacts</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
            <div className="p-3.5 bg-sand-50 rounded-xl border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink text-sm">Ramesh Patil</span>
                <Badge variant="default" className="text-[10px]">Son / Primary</Badge>
              </div>
              <p className="text-xs text-ink-soft">Lives nearby (Paud Gaon)</p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="tel:+919822019923"
                  className="flex-1 text-center py-1.5 bg-gov-600 text-white text-xs font-semibold rounded-lg hover:bg-gov-700"
                >
                  Call: +91 98220 19923
                </a>
              </div>
            </div>

            <div className="p-3.5 bg-sand-50 rounded-xl border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink text-sm">Sunita Patil (ASHA)</span>
                <Badge variant="info" className="text-[10px]">Local Health Worker</Badge>
              </div>
              <p className="text-xs text-ink-soft">Assigned ASHA Worker (Ward 3)</p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="tel:+919423188231"
                  className="flex-1 text-center py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700"
                >
                  Call ASHA: +91 94231 88231
                </a>
              </div>
            </div>
          </div>

          {/* Location details */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">Primary Registered Residence</p>
              <p className="text-xs text-amber-700 mt-0.5">
                House #14, Near Maruti Temple, Paud Village, Mulshi Taluka, Pune - 412108.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PatientEmergency;

