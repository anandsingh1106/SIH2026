import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1.5 text-xs text-ink-soft mb-3" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-gov-700 transition-colors flex items-center gap-1" aria-label="Home">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-line-strong shrink-0" aria-hidden="true" />
            {isLast || !item.href ? (
              <span className="font-semibold text-ink truncate" aria-current="page">{item.label}</span>
            ) : (
              <Link to={item.href} className="hover:text-gov-700 transition-colors truncate">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
