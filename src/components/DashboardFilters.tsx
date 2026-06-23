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
  canImport?: boolean;
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
  canImport = true,
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
    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={onClearFilters}
        disabled={!hasActiveFilters}
        className="cursor-pointer"
      >
        <X />
        Limpar
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onExportCSV}
        className="size-9 cursor-pointer"
        aria-label="Exportar CSV"
        title="Exportar CSV"
      >
        <Download />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onExportExcel}
        className="size-9 cursor-pointer"
        aria-label="Exportar Excel"
        title="Exportar Excel"
      >
        <Download />
      </Button>
      {canImport && (
        <Button size="sm" onClick={onImport} className="cursor-pointer">
          <Upload />
          Importar
        </Button>
      )}
    </div>
  );

  const fields = (
    <>
      <div className="min-w-0 space-y-2 min-[1400px]:min-w-[330px]">
        <label className="text-xs font-semibold text-foreground" htmlFor="dashboard-data-inicial">
          Período
        </label>
        <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
          <Input
            id="dashboard-data-inicial"
            type="date"
            value={filters.dataInicial}
            onChange={(e) => onFilterChange({ ...filters, dataInicial: e.target.value })}
            className="min-w-[150px]"
          />
          <Input
            id="dashboard-data-final"
            type="date"
            value={filters.dataFinal}
            onChange={(e) => onFilterChange({ ...filters, dataFinal: e.target.value })}
            aria-label="Data final"
            className="min-w-[150px]"
          />
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <label htmlFor="dashboard-tecnico" className="text-xs font-semibold text-foreground">
          Técnico
        </label>
        <MultiSelectCombobox
          id="dashboard-tecnico"
          aria-label="Filtrar por técnico"
          options={tecnicos}
          selected={filters.tecnicos}
          onChange={(v) => onFilterChange({ ...filters, tecnicos: v })}
          placeholder="Todos"
        />
      </div>

      <div className="min-w-0 space-y-2">
        <label htmlFor="dashboard-supervisor" className="text-xs font-semibold text-foreground">
          Supervisor
        </label>
        <MultiSelectCombobox
          id="dashboard-supervisor"
          aria-label="Filtrar por supervisor"
          options={supervisores}
          selected={filters.supervisores}
          onChange={(v) => onFilterChange({ ...filters, supervisores: v })}
          placeholder="Todos"
        />
      </div>

      <div className="min-w-0 space-y-2">
        <label htmlFor="dashboard-busca" className="text-xs font-semibold text-foreground">
          Busca
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="dashboard-busca"
            placeholder="Buscar"
            value={filters.busca}
            onChange={(e) => onFilterChange({ ...filters, busca: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:items-end min-[1400px]:grid-cols-[minmax(330px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(160px,1fr)_auto]">
      {fields}
      <div className="space-y-2 lg:min-w-max">
        <div className="flex min-h-4 items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Ações</span>
          {hasActiveFilters && <Badge variant="secondary">{activeCount}</Badge>}
        </div>
        {actions}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="dashboard-panel p-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground"
            >
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

  return <section className="dashboard-panel p-3 sm:p-4">{filterContent}</section>;
};

export default DashboardFilters;
