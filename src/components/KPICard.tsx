import React from 'react';
import { BarChart3, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

const colorMap = {
  primary: {
    border: 'border-l-primary',
    icon: 'bg-primary/10 text-primary',
    value: 'text-foreground',
  },
  success: {
    border: 'border-l-success',
    icon: 'bg-success/10 text-success',
    value: 'text-success',
  },
  warning: {
    border: 'border-l-warning',
    icon: 'bg-warning/10 text-warning',
    value: 'text-warning',
  },
  destructive: {
    border: 'border-l-destructive',
    icon: 'bg-destructive/10 text-destructive',
    value: 'text-destructive',
  },
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon = BarChart3,
  trend,
  color = 'primary',
}) => {
  const colors = colorMap[color];

  return (
    <Card className={cn('overflow-hidden border-l-4 shadow-sm transition-colors hover:border-primary/40', colors.border)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase text-muted-foreground">{title}</p>
            <p className={cn('mt-1 truncate font-display text-xl font-bold leading-tight sm:text-2xl', colors.value)}>
              {value}
            </p>
            {subtitle && (
              <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                {trend === 'up' && <TrendingUp className="size-3.5 shrink-0 text-success" />}
                {trend === 'down' && <TrendingDown className="size-3.5 shrink-0 text-destructive" />}
                <span className="truncate">{subtitle}</span>
              </p>
            )}
          </div>

          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', colors.icon)}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
