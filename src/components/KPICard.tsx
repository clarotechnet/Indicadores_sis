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
    icon: 'bg-primary/10 text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
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
    <Card className="overflow-hidden shadow-sm transition-colors hover:border-primary/30">
      <CardContent className="p-4">
        <div className="relative min-h-[104px]">
          <div className="min-w-0 pr-11">
            <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
          </div>

          <div className={cn('absolute right-0 top-0 flex size-10 items-center justify-center rounded-lg', colors.icon)}>
            <Icon className="size-5" />
          </div>

          <div className="mt-3 min-w-0">
            <p className="font-display text-2xl font-bold leading-none text-foreground sm:text-[1.7rem]">{value}</p>
            {subtitle && (
              <p className="mt-3 flex min-w-0 items-start gap-1.5 text-xs leading-snug text-muted-foreground">
                {trend === 'up' && <TrendingUp className="size-3.5 shrink-0 text-success" />}
                {trend === 'down' && <TrendingDown className="size-3.5 shrink-0 text-destructive" />}
                <span>{subtitle}</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
