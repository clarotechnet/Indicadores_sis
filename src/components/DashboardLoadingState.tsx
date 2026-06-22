import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardLoadingStateProps {
  title?: string;
  description?: string;
  cards?: number;
}

const DashboardLoadingState = ({
  title = 'Carregando dados',
  description = 'Preparando os indicadores para exibicao.',
  cards = 6,
}: DashboardLoadingStateProps) => (
  <div className="flex flex-col gap-4" aria-live="polite" aria-busy="true">
    <div className="grid grid-cols-1 dashboard-grid-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="size-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          {title}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default DashboardLoadingState;
