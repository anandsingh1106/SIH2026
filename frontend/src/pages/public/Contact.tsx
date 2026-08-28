import React, { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const ContactPage: React.FC = () => {
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    district: 'Pune',
    subject: 'General Grievance / Feedback',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = 'GRV-MH-' + Math.floor(100000 + Math.random() * 900000);
    setSubmittedId(token);
  };

  const nodalOfficers = [
    { district: 'Pune', officer: 'Dr. Bhagwan Pawar', role: 'District Civil Surgeon', phone: '020-27280422', email: 'cs.pune@maharashtra.gov.in' },
    { district: 'Mumbai City & Suburban', officer: 'Dr. Daksha Shah', role: 'Executive Health Officer', phone: '022-22620251', email: 'eho.mumbai@mcgm.gov.in' },
    { district: 'Nagpur', officer: 'Dr. Madhuri Thorat', role: 'Civil Surgeon', phone: '0712-2560233', email: 'cs.nagpur@maharashtra.gov.in' },
    { district: 'Gadchiroli', officer: 'Dr. Pramod Khandate', role: 'District Health Officer (DHO)', phone: '07132-222100', email: 'dho.gadchiroli@maharashtra.gov.in' },
    { district: 'Nashik', officer: 'Dr. Ashok Thorat', role: 'Civil Surgeon', phone: '0253-2573281', email: 'cs.nashik@maharashtra.gov.in' },
  ];

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-gov-700" />
            Contact & Citizen Grievance Redressal Portal
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Directorate of Health Services, District Nodal Officers directory, and official citizen support.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: HQ Details & Grievance Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gov-700" />
                State Health Directorate Headquarters
              </h3>

              <div className="text-xs text-ink-muted space-y-2">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gov-700 shrink-0 mt-0.5" />
                  <span><strong>Arogya Bhavan:</strong> St. George Hospital Compound, P. D'Mello Road, Fort, Mumbai - 400001</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gov-700 shrink-0" />
                  <span><strong>Toll-Free Control Room:</strong> 1800 233 2200 / 022-22620251</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gov-700 shrink-0" />
                  <span><strong>Public Health Email:</strong> dph.mumbai@maharashtra.gov.in</span>
                </p>
              </div>
            </div>

            {/* Grievance Submission Form */}
            <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-ink text-base">
                Submit Citizen Grievance / Facility Feedback
              </h3>

              {submittedId ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-base text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Grievance Registered Successfully
                  </div>
                  <p>Your Grievance Tracking Token Number is: <strong className="font-mono text-sm">{submittedId}</strong></p>
                  <p className="text-ink-muted">The District Civil Surgeon office has been notified and will address your ticket within 48 business hours.</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setSubmittedId(null)}>
                    Submit Another Query
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
                    <Input
                      label="Full Name"
                      required
                      placeholder="e.g. Ramesh Patil"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      required
                      placeholder="e.g. +91 98500 12345"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      placeholder="e.g. ramesh@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1.5">Relevant District</label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full text-xs border border-sand-300 rounded-lg p-2 bg-surface focus:outline-none focus:border-gov-600"
                      >
                        <option value="Pune">Pune</option>
                        <option value="Mumbai City">Mumbai City</option>
                        <option value="Nagpur">Nagpur</option>
                        <option value="Nashik">Nashik</option>
                        <option value="Gadchiroli">Gadchiroli</option>
                        <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1.5">Detailed Grievance / Inquiry</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe your query or facility issue..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full text-xs border border-sand-300 rounded-lg p-3 focus:outline-none focus:border-gov-600"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="md" leftIcon={<Send className="w-4 h-4" />}>
                    Submit Official Grievance
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: District Nodal Officers Directory */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
                District Nodal Health Officers Directory
              </h3>

              <div className="space-y-3">
                {nodalOfficers.map((no, idx) => (
                  <div key={idx} className="p-3 bg-sand-50 border border-line rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-ink">{no.district} District</span>
                      <span className="text-[10px] text-gov-800 bg-gov-100 font-semibold px-2 py-0.5 rounded">
                        {no.role}
                      </span>
                    </div>
                    <div className="text-sand-700 font-medium">{no.officer}</div>
                    <div className="text-[11px] text-ink-soft flex items-center justify-between pt-1">
                      <span>📞 {no.phone}</span>
                      <a href={`mailto:${no.email}`} className="text-gov-700 hover:underline">
                        ✉️ Email
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
