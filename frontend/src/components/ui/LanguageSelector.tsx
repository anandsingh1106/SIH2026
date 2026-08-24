import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { Language } from '../../data/i18n';

export const LanguageSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language, setLanguage } = useI18n();

  const options: { code: Language; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  ];

  return (
    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-lg p-1 text-xs">
      <Globe className="w-3.5 h-3.5 text-gov-700 ml-1 shrink-0" />
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.code}
            onClick={() => setLanguage(opt.code)}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              language === opt.code
                ? 'bg-gov-700 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={opt.label}
          >
            {compact ? opt.code.toUpperCase() : opt.native}
          </button>
        ))}
      </div>
    </div>
  );
};
