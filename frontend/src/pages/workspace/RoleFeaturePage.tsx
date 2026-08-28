import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Download, Filter, Plus, Search, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

type Screen = { title: string; description: string; action: string; items: string[] };

const screens: Record<string, Screen> = {
  '/specialist/beds': { title: 'Bed availability', description: 'Coordinate admissions across emergency, ICU, isolation and general wards.', action: 'Update availability', items: ['Emergency ward · 4 beds available', 'ICU · 2 monitored beds available', 'Isolation · 6 beds available'] },
  '/specialist/consultations': { title: 'Specialist consultations', description: 'Review referral context, document findings and share a clinical plan.', action: 'Start consultation', items: ['Referral MAS-24081 · Cardiology review', 'Referral MAS-24077 · Neurology follow-up', 'Referral MAS-24065 · Orthopaedic review'] },
  '/specialist/treatment-plans': { title: 'Treatment plans', description: 'Create clinician-owned goals, procedures, monitoring and follow-up plans.', action: 'Create treatment plan', items: ['Cardiac monitoring plan · 24 hour review', 'Post-procedure plan · Patient education due', 'Diabetes care plan · Follow-up in 14 days'] },
  '/specialist/follow-ups': { title: 'Follow-ups', description: 'Track specialist follow-ups and send clear next steps to referring care teams.', action: 'Schedule follow-up', items: ['Sunita J. · Due today · Teleconsultation', 'Ramesh P. · Due tomorrow · In-person', 'Amina K. · Due Friday · Lab review'] },
  '/specialist/discharge': { title: 'Discharge planning', description: 'Prepare a safe, understandable discharge summary and coordinated handover.', action: 'Prepare discharge', items: ['Patient education and warning signs', 'Medicines and care plan confirmation', 'Referring facility follow-up task'] },
  '/patient/vaccinations': { title: 'Vaccination history', description: 'Keep track of completed doses and upcoming reminders for your family.', action: 'View schedule', items: ['Tetanus booster · Completed 12 Jun 2026', 'Influenza · Due Sep 2026', 'Family record · Child immunization review'] },
  '/patient/emergency': { title: 'Emergency support', description: 'For a life-threatening emergency, call 112 or 108 immediately.', action: 'Call 108 ambulance', items: ['Nearest emergency facility · 3.2 km', 'Your preferred contact · Available', 'First-response guidance · Open'] },
  '/patient/family': { title: 'Family health', description: 'Manage consented family profiles, appointments, vaccinations and prescriptions.', action: 'Add family member', items: ['Meera Patil · Vaccination due in 12 days', 'Anil Patil · Prescription active', 'Family consent settings · Up to date'] },
};

const adminScreen = (path: string): Screen => {
  const name = path.split('/').pop()?.replace(/-/g, ' ') ?? 'command center';
  return { title: name.replace(/\b\w/g, (x) => x.toUpperCase()), description: 'State health operations view with traceable filters, action-oriented signals and privacy-aware aggregated data.', action: name === 'reports' ? 'Export report' : `Manage ${name}`, items: ['Pune district · Performance above benchmark', 'Nashik district · Review medicine threshold', 'Konkan region · Referral volume increased'] };
};

export default function RoleFeaturePage() {
  const { pathname } = useLocation();
  const screen = screens[pathname] ?? adminScreen(pathname);
  const [query, setQuery] = useState('');
  const [completed, setCompleted] = useState<string[]>([]);
  const visible = screen.items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  const handleAction = () => {
    if (screen.action.startsWith('Call')) window.location.href = 'tel:108';
    else setCompleted((items) => [...items, `Action recorded at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`]);
  };
  return <section className="space-y-6" aria-labelledby="feature-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-sm font-semibold text-gov-700">MahaAarogya Sangam</p><h1 id="feature-title" className="text-2xl font-bold text-ink">{screen.title}</h1><p className="mt-1 max-w-2xl text-ink-muted">{screen.description}</p></div>
      <Button onClick={handleAction} className="min-h-11"><Plus size={18} aria-hidden="true" />{screen.action}</Button>
    </div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><Input aria-label={`Search ${screen.title}`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${screen.title.toLowerCase()}`} /><Button variant="outline"><Filter size={17} aria-hidden="true" />Filters</Button></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Activity size={19} className="text-gov-700" />Current items</CardTitle></CardHeader><CardContent className="space-y-3">{visible.map((item) => <div key={item} className="flex items-center justify-between gap-3 rounded-lg border border-line p-4"><span className="font-medium text-ink">{item}</span><Badge variant="info">Active</Badge></div>)}{visible.length === 0 && <p className="py-6 text-center text-ink-soft">No matching records. Try a different search.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck size={19} className="text-emerald-700" />Safe actions</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-ink-muted">Changes are recorded in the demo audit trail and require confirmation in production.</p><Button variant="outline" className="w-full" onClick={() => setCompleted((items) => [...items, 'Review saved'])}><CheckCircle2 size={17} />Save review</Button><Button variant="outline" className="w-full" onClick={() => setCompleted((items) => [...items, 'Export prepared'])}><Download size={17} />Export view</Button>{completed.map((item) => <p key={item} className="text-xs text-emerald-700">{item}</p>)}</CardContent></Card>
    </div>
    <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} aria-hidden="true" />Demo data only. Clinical decisions remain with qualified healthcare professionals.</p>
  </section>;
}
