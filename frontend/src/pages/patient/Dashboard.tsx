import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Pill,
  FlaskConical,
  ArrowRightLeft,
  PhoneCall,
  Bell,
  Heart,
  Activity,
  AlertTriangle,
  ChevronRight,
  Syringe,
  Clock,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/ui/MetricCard';
import { INITIAL_PATIENTS, INITIAL_PRESCRIPTIONS, INITIAL_REFERRALS } from '../../data/mockData';

export const PatientDashboard: React.FC = () => {
  const patient = INITIAL_PATIENTS[0];
  const prescription = INITIAL_PRESCRIPTIONS[0];
  const referral = INITIAL_REFERRALS.find(r => r.patientId === patient.id);

  const nextAppointment = {
    date: '25 Aug 2026',
    time: '10:30 AM',
    doctor: 'Dr. Rajesh Deshmukh',
    facility: 'PHC Paud, Mulshi',
    type: 'Follow-up Consultation',
  };

  const upcomingVaccine = {
    name: 'Influenza Vaccine (Annual)',
    dueDate: '01 Sep 2026',
    status: 'due',
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gov-700 via-gov-700 to-gov-800 rounded-2xl p-6 text-white shadow-glow">
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-gov-200 text-sm font-medium">Good morning,</p>
            <h1 className="font-display text-2xl font-extrabold mt-0.5">{patient.name}</h1>
            <p className="text-gov-200 text-sm mt-1">ABHA ID: {patient.abhaId}</p>
            <div className="flex items-center gap-2 mt-3">
              <Shield className="w-4 h-4 text-gov-200" />
              <span className="text-sm text-gov-100">Health records are secure & private</span>
            </div>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/40">
              {(patient.name ?? '?').charAt(0)}
            </div>
            <Badge variant="success" className="mt-2 text-xs">Verified</Badge>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl font-bold">O+</p>
            <p className="text-gov-200 text-xs">Blood Group</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="text-2xl font-bold">{patient.age}</p>
            <p className="text-gov-200 text-xs">Age (Years)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold capitalize">{patient.riskCategory}</p>
            <p className="text-gov-200 text-xs">Risk Level</p>
          </div>
        </div>
      </div>

      {/* Emergency SOS */}
      <Link to="/patient/emergency">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center justify-between hover:bg-red-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-red-700">Emergency SOS</p>
              <p className="text-xs text-red-600">Ambulance 108 · Emergency contacts ready</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-red-500" />
        </div>
      </Link>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Active Medicines"
          value={prescription?.medicines.length ?? 3}
          icon={<Pill className="w-5 h-5" />}
          color="gov"
        />
        <MetricCard
          title="Pending Reports"
          value={2}
          icon={<FlaskConical className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Referral Status"
          value={referral ? 1 : 0}
          icon={<ArrowRightLeft className="w-5 h-5" />}
          color="amber"
        />
        <MetricCard
          title="Vaccinations Due"
          value={1}
          icon={<Syringe className="w-5 h-5" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
        {/* Next Appointment */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gov-600" />
            <h2 className="font-display font-bold text-ink">Next Appointment</h2>
          </div>
          <div className="bg-gov-50 rounded-xl p-4 border border-gov-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gov-800">{nextAppointment.type}</p>
                <p className="text-sm text-ink-muted mt-1">{nextAppointment.doctor}</p>
                <p className="text-xs text-ink-soft">{nextAppointment.facility}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gov-700">{nextAppointment.date}</p>
                <p className="text-sm text-ink-soft">{nextAppointment.time}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Link
                to="/patient/appointments"
                className="flex-1 bg-gov-600 text-white text-xs font-semibold py-2 rounded-lg text-center hover:bg-gov-700 transition-colors"
              >
                View Details
              </Link>
              <button className="flex-1 border border-gov-300 text-gov-700 text-xs font-semibold py-2 rounded-lg hover:bg-gov-50 transition-colors">
                Reschedule
              </button>
            </div>
          </div>
        </Card>

        {/* Current Prescription */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-gov-600" />
              <h2 className="font-display font-bold text-ink">Current Medicines</h2>
            </div>
            <Link to="/patient/prescriptions" className="text-xs text-gov-600 font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(prescription?.medicines.slice(0, 3) ?? [
              { name: 'Amlodipine 5mg', frequency: '1-0-0', instructions: 'After breakfast' },
              { name: 'Metformin 500mg', frequency: '1-0-1', instructions: 'After meals' },
              { name: 'Aspirin 75mg', frequency: '0-1-0', instructions: 'After lunch' },
            ]).map((med: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-sand-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-ink">{med.name}</p>
                  <p className="text-xs text-ink-soft">{med.instructions || 'As directed'}</p>
                </div>
                <Badge variant="info" className="text-xs shrink-0">{med.frequency}</Badge>
              </div>
            ))}
          </div>
          <Link
            to="/patient/audio-prescription"
            className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold py-2.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Activity className="w-4 h-4" />
            Listen to Audio Explanation
          </Link>
        </Card>

        {/* Referral Status */}
        {referral && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              <h2 className="font-display font-bold text-ink">Active Referral</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Specialty</span>
                <span className="text-sm font-semibold">{referral.specialty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Referred to</span>
                <span className="text-sm font-semibold text-right max-w-[150px]">{referral.targetFacilityName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Status</span>
                <Badge
                  variant={referral.status === 'accepted' ? 'success' : referral.status === 'created' ? 'info' : 'warning'}
                  className="capitalize text-xs"
                >
                  {referral.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <Link
              to="/patient/referrals"
              className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold py-2.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              Track Referral Journey <ChevronRight className="w-3 h-3" />
            </Link>
          </Card>
        )}

        {/* Health Reminders */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gov-600" />
            <h2 className="font-display font-bold text-ink">Health Reminders</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Vaccination Due</p>
                <p className="text-xs text-amber-700">{upcomingVaccine.name}</p>
                <p className="text-xs text-amber-600 mt-0.5">Due: {upcomingVaccine.dueDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Lab Report Ready</p>
                <p className="text-xs text-blue-700">Complete Blood Count results available</p>
                <p className="text-xs text-blue-600 mt-0.5">Ordered: 20 Aug 2026</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Medicine Refill Reminder</p>
                <p className="text-xs text-green-700">Amlodipine stock lasts 3 more days</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="p-5">
        <h2 className="font-display font-bold text-ink mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Health Timeline', icon: <Clock className="w-5 h-5" />, to: '/patient/timeline', color: 'text-gov-600 bg-gov-50' },
            { label: 'Lab Reports', icon: <FlaskConical className="w-5 h-5" />, to: '/patient/lab-reports', color: 'text-blue-600 bg-blue-50' },
            { label: 'Prescriptions', icon: <Pill className="w-5 h-5" />, to: '/patient/prescriptions', color: 'text-purple-600 bg-purple-50' },
            { label: 'Vaccinations', icon: <Syringe className="w-5 h-5" />, to: '/patient/vaccinations', color: 'text-green-600 bg-green-50' },
            { label: 'Family Profiles', icon: <Heart className="w-5 h-5" />, to: '/patient/family', color: 'text-pink-600 bg-pink-50' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-sand-50 hover:shadow-soft transition-all hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs ${item.color}`}>
                {item.icon}
              </div>
              <span className="text-xs font-medium text-sand-700 text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PatientDashboard;

