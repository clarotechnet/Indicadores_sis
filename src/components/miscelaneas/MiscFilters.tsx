import React, { useState } from 'react';
import { ChevronDown, Filter, Upload, X } from 'lucide-react';

import MultiSelectCombobox from '@/components/MultiSelectCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { MiscFilterState } from '@/pages/ExcessoMiscelaneas';

interface MiscFiltersProps {
  supervisores: string[];
  tecnicos: string[];
  filters: MiscFilterState;
  onFilterChange: (filters: MiscFilterState) => void;
  onClearFilters: () => void;
  onImport: () => void;
}

const MiscFilters: React.FC<MiscFiltersProps> = ({
  supervisores,
  tecnicos,
  filters,
  onFilterChange,
  onClearFilters,
  onImport,
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const activeCount = [
    filters.mes ? 1 : 0,
    filters.supervisores.length,
    filters.tecnicos.length,
  ].reduce((sum, value) => sum + value, 0);
  const hasActiveFilters = activeCount > 0;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onClearFilters} disabled={!hasActiveFilters} className="cursor-pointer">
        <X />
        Limpar
      </Button>
      <Button size="sm" onClick={onImport} className="cursor-pointer">
        <Upload />
        Importar
      </Button>
    </div>
  );

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="misc-mes" className="text-xs font-semibold uppercase text-muted-foreground">
            Mês
          </label>
          <Input
            id="misc-mes"
            type="month"
            value={filters.mes}
            onChange={(e) => onFilterChange({ ...filters, mes: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="misc-supervisor" className="text-xs font-semibold uppercase text-muted-foreground">
            Supervisor
          </label>
          <MultiSelectCombobox
            id="misc-supervisor"
            aria-label="Filtrar miscelâneas por supervisor"
            options={supervisores}
            selected={filters.supervisores}
            onChange={(v) => onFilterChange({ ...filters, supervisores: v })}
            placeholder="Todos os supervisores"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="misc-tecnico" className="text-xs font-semibold uppercase text-muted-foreground">
            Técnico
          </label>
          <MultiSelectCombobox
            id="misc-tecnico"
            aria-label="Filtrar miscelâneas por técnico"
            options={tecnicos}
            selected={filters.tecnicos}
            onChange={(v) => onFilterChange({ ...filters, tecnicos: v })}
            placeholder="Todos os técnicos"
          />
        </div>

        <div className="flex items-end sm:hidden">{actions}</div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="dashboard-panel p-3">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <Filter className="size-4 text-primary" />
                Filtros
                {hasActiveFilters && <Badge variant="secondary">{activeCount}</Badge>}
              </span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">{filterContent}</CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <section className="dashboard-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="size-4 text-primary" />
          Filtros
          {hasActiveFilters && <Badge variant="secondary">{activeCount} ativos</Badge>}
        </div>
        {actions}
      </div>
      {filterContent}
    </section>
  );
};

export default MiscFilters;
