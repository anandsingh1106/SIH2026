import React from 'react';
import { Newspaper, Calendar, ArrowRight, BellRing, Sparkles } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const NewsPage: React.FC = () => {
  const articles = [
    {
      id: 'news-1',
      title: 'State Health Department Launches Monsoon Vector-Borne Disease Surge Protocol',
      category: 'Public Health Alert',
      date: 'August 22, 2026',
      source: 'Directorate of Health Services, Mumbai',
      summary: 'Rapid response testing kits for Dengue NS1 and Malaria distributed across 1,800 rural PHCs. Frontline ASHA workers mobilized for door-to-door water container surveillance in Gadchiroli and Palghar.',
      featured: true,
    },
    {
      id: 'news-2',
      title: 'Over 1.4 Million Cashless Treatments Approved Under MJPJAY This Fiscal Year',
      category: 'Healthcare Scheme',
      date: 'August 18, 2026',
      source: 'State Health Assurance Society',
      summary: 'Enhanced ₹5 Lakh annual family coverage enables record cardiac, oncology, and neurosurgery admissions across empaneled government and private hospitals.',
    },
    {
      id: 'news-3',
      title: 'MahaAarogya Sangam Offline Engine Deployed to 65,000+ ASHA Tablets',
      category: 'Digital Innovation',
      date: 'August 10, 2026',
      source: 'National Health Mission Maharashtra',
      summary: 'Frontline health workers can now seamlessly record maternal ANC checkups and child immunizations in remote offline villages without cellular connectivity.',
    },
    {
      id: 'news-4',
      title: 'Special Immunization Drive (Intensified Mission Indradhanush) Commences',
      category: 'Immunization',
      date: 'August 05, 2026',
      source: 'Family Welfare Bureau, Pune',
      summary: 'Targeted drive aims for 100% coverage of MR-1, Pentavalent, and JE vaccines for children under 2 years and pregnant women across high-priority tribal blocks.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Newspaper className="w-7 h-7 text-gov-700" />
            Maharashtra State Public Health Bulletins & News
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Official announcements, epidemic advisories, vaccination drives, and healthcare policy updates.
          </p>
        </div>

        {/* Featured Article */}
        {articles.filter((a) => a.featured).map((feat) => (
          <div
            key={feat.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:shadow-card transition-all space-y-4"
          >
            <div className="flex items-center gap-2">
              <Badge variant="danger">
                <BellRing className="w-3.5 h-3.5 mr-1" />
                {feat.category}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">• {feat.date}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {feat.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
              {feat.summary}
            </p>
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span className="font-semibold">Source: {feat.source}</span>
              <button
                onClick={() => alert(`Opening full bulletin: ${feat.title}`)}
                className="font-bold text-gov-700 hover:underline flex items-center gap-1"
              >
                Read Official Bulletin →
              </button>
            </div>
          </div>
        ))}

        {/* Grid of Other Articles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.filter((a) => !a.featured).map((art) => (
            <div
              key={art.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-card transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="primary" size="sm">
                    {art.category}
                  </Badge>
                  <span className="text-[11px] text-slate-400">{art.date}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">{art.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{art.summary}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{art.source}</span>
                <button
                  onClick={() => alert(`Opening full report: ${art.title}`)}
                  className="font-bold text-gov-700 hover:underline"
                >
                  Read More →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
