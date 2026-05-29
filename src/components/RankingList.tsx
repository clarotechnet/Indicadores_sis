import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, AlertTriangle } from 'lucide-react';

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
  const iconColor = type === 'best' ? 'text-success' : 'text-destructive';

  const getBarWidth = (valor: number) => {
    if (invertido) {
      return Math.min(valor * 3, 100);
    }
    return Math.min(valor, 100);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3">
              <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                type === 'best' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm truncate text-foreground">{item.nome}</span>
                  <span className={`text-xs sm:text-sm font-semibold shrink-0 ${
                    type === 'best' ? 'text-success' : 'text-destructive'
                  }`}>
                    {item.valor.toFixed(1)}{suffix}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      type === 'best' ? 'bg-success' : 'bg-destructive'
                    }`}
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
