import React from 'react';
import { Priority } from '@arogyasetu/shared/types';
import { Badge } from '../ui/Badge';
import { AlertCircle, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export const TriageBadge: React.FC<{ priority: Priority; showIcon?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({
  priority,
  showIcon = true,
  size = 'md',
}) => {
  const configs = {
    critical: {
      variant: 'critical' as const,
      label: 'CRITICAL (Tier 1)',
      labelMr: 'अति-तातडीचे',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    high: {
      variant: 'danger' as const,
      label: 'HIGH RISK (Tier 2)',
      labelMr: 'उच्च जोखीम',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    moderate: {
      variant: 'warning' as const,
      label: 'MODERATE (Tier 3)',
      labelMr: 'मध्यम',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    low: {
      variant: 'success' as const,
      label: 'STABLE / ROUTINE',
      labelMr: 'स्थिर',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
  };

  const current = configs[priority] || configs.low;

  return (
    <Badge variant={current.variant} size={size}>
      {showIcon && current.icon}
      <span>{current.label}</span>
    </Badge>
  );
};
