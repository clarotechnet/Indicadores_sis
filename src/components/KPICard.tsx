import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, BarChart3, type LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

const colorMap = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10',
};

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon = BarChart3, trend, color = 'primary' }) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-display font-bold text-foreground truncate">{value}</p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-success shrink-0" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive shrink-0" />}
                <span className="truncate">{subtitle}</span>
              </p>
            )}
          </div>
          <div className={`p-2 sm:p-2.5 rounded-lg ${colorMap[color]} shrink-0 ml-2`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
