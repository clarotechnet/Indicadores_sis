import React, { useState } from 'react';
import { ChevronDown, Download, Filter, Search, Upload, X } from 'lucide-react';

import MultiSelectCombobox from '@/components/MultiSelectCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface DashboardFilterState {
  tecnicos: string[];
  supervisores: string[];
  dataInicial: string;
  dataFinal: string;
  busca: string;
}

interface DashboardFiltersProps {
  tecnicos: string[];
  supervisores: string[];
  filters: DashboardFilterState;
  onFilterChange: (filters: DashboardFilterState) => void;
  onClearFilters: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onImport: () => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  tecnicos,
  supervisores,
  filters,
  onFilterChange,
  onClearFilters,
  onExportCSV,
  onExportExcel,
  onImport,
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);

  const activeCount = [
    filters.tecnicos.length,
    filters.supervisores.length,
    filters.dataInicial ? 1 : 0,
    filters.dataFinal ? 1 : 0,
    filters.busca ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
  const hasActiveFilters = activeCount > 0;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onClearFilters} disabled={!hasActiveFilters} className="cursor-pointer">
        <X />
        Limpar
      </Button>
      <Button variant="outline" size="sm" onClick={onExportCSV} className="cursor-pointer">
        <Download />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onExportExcel} className="cursor-pointer">
        <Download />
        Excel
      </Button>
      <Button size="sm" onClick={onImport} className="cursor-pointer">
        <Upload />
        Importar
      </Button>
    </div>
  );

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="dashboard-tecnico" className="text-xs font-semibold uppercase text-muted-foreground">
            Técnico
          </label>
          <MultiSelectCombobox
            id="dashboard-tecnico"
            aria-label="Filtrar por técnico"
            options={tecnicos}
            selected={filters.tecnicos}
            onChange={(v) => onFilterChange({ ...filters, tecnicos: v })}
            placeholder="Todos os técnicos"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="dashboard-supervisor" className="text-xs font-semibold uppercase text-muted-foreground">
            Supervisor
          </label>
          <MultiSelectCombobox
            id="dashboard-supervisor"
            aria-label="Filtrar por supervisor"
            options={supervisores}
            selected={filters.supervisores}
            onChange={(v) => onFilterChange({ ...filters, supervisores: v })}
            placeholder="Todos os supervisores"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="dashboard-data-inicial" className="text-xs font-semibold uppercase text-muted-foreground">
            Data inicial
          </label>
          <Input
            id="dashboard-data-inicial"
            type="date"
            value={filters.dataInicial}
            onChange={(e) => onFilterChange({ ...filters, dataInicial: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="dashboard-data-final" className="text-xs font-semibold uppercase text-muted-foreground">
            Data final
          </label>
          <Input
            id="dashboard-data-final"
            type="date"
            value={filters.dataFinal}
            onChange={(e) => onFilterChange({ ...filters, dataFinal: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="dashboard-busca" className="text-xs font-semibold uppercase text-muted-foreground">
            Busca
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dashboard-busca"
              placeholder="Nome, login ou supervisor"
              value={filters.busca}
              onChange={(e) => onFilterChange({ ...filters, busca: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="sm:hidden">{actions}</div>
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

export default DashboardFilters;
