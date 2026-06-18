import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankingItem {
  nome: string;
  valor: number;
}

interface RankingListProps {
  title: string;
  items: RankingItem[];
  type: 'best' | 'worst';
  suffix?: string;
  invertido?: boolean;
}

const RankingList: React.FC<RankingListProps> = ({ title, items, type, suffix = '%', invertido = false }) => {
  const Icon = type === 'best' ? Trophy : AlertTriangle;
  const isBest = type === 'best';

  const getBarWidth = (valor: number) => {
    if (invertido) {
      return Math.min(valor * 3, 100);
    }
    return Math.min(valor, 100);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn('flex size-7 items-center justify-center rounded-md', isBest ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
        ) : (
          items.map((item, i) => (
            <div key={`${item.nome}-${i}`} className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40">
              <span className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                isBest ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-medium text-foreground">{item.nome}</span>
                  <span className={cn('shrink-0 text-sm font-semibold', isBest ? 'text-success' : 'text-destructive')}>
                    {item.valor.toFixed(1)}{suffix}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', isBest ? 'bg-success' : 'bg-destructive')}
                    style={{ width: `${getBarWidth(item.valor)}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RankingList;
