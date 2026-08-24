import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Phone, Mail, MapPin, Heart, ExternalLink } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 text-xs">
      <div className="trust-divider" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-base shadow-soft">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-white text-base">MahaAarogya Sangam</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Official Digital Healthcare Infrastructure of Maharashtra, connecting 36 districts, frontline ASHA workers, primary health centers, and tertiary hospitals into an accessible public health ecosystem.
            </p>
            <div className="pt-2 text-[11px] text-gov-400">
              Government of Maharashtra Initiative
            </div>
          </div>

          {/* Column 2: Public Portals */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Public Health Services</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/facilities" className="hover:text-white transition-colors">Find Health Centers & Hospitals</Link></li>
              <li><Link to="/find-medicines" className="hover:text-white transition-colors">Essential Medicine Stock</Link></li>
              <li><Link to="/emergency" className="hover:text-white transition-colors">24x7 Emergency Trauma & Ambulance</Link></li>
              <li><Link to="/health-programs" className="hover:text-white transition-colors">Mahatma Jyotirao Phule Jan Arogya Yojana</Link></li>
              <li><Link to="/clinical-guidelines" className="hover:text-white transition-colors">Standard Clinical Guidelines</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">State Health News & Bulletins</Link></li>
            </ul>
          </div>

          {/* Column 3: Workspaces */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Role Workspaces</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/asha/dashboard" className="hover:text-white transition-colors">ASHA Frontline Digital Workspace</Link></li>
              <li><Link to="/doctor/dashboard" className="hover:text-white transition-colors">Primary Medical Officer Clinic</Link></li>
              <li><Link to="/specialist/dashboard" className="hover:text-white transition-colors">Tertiary Specialist & Bed Allocation</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">State Health Command Center</Link></li>
              <li><Link to="/patient/dashboard" className="hover:text-white transition-colors">Citizen Personal Health Record</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Create an Account</Link></li>
            </ul>
          </div>

          {/* Column 4: Emergency Contacts & Help */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Emergency & Support</h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-400" />
                <span className="font-bold text-white">108</span> (Ambulance & Trauma Dispatch)
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">104</span> (State Health Advice Helpline)
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white">155388</span> (MJPJAY Insurance Support)
              </div>
              <div className="flex items-center gap-2 text-slate-400 pt-1">
                <Mail className="w-4 h-4" />
                <span>support.arogya@maharashtra.gov.in</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap justify-between items-center gap-4 text-[11px] text-slate-400">
          <div>
            © 2026 Public Health Department, Government of Maharashtra. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-slate-300">Privacy & Data Governance</Link>
            <Link to="/about" className="hover:text-slate-300">Accessibility (WCAG 2.1 AA)</Link>
            <Link to="/about" className="hover:text-slate-300">Offline-First Architecture</Link>
            <Link to="/contact" className="hover:text-slate-300">Grievance Redressal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
