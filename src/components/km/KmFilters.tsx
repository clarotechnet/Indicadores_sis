import React from 'react';
import { Filter, Upload, X } from 'lucide-react';

import MultiSelectCombobox from '@/components/MultiSelectCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface KmFilterState {
  dataInicial: string;
  dataFinal: string;
  tecnicos: string[];
  frentes: string[];
  supervisores: string[];
}

interface KmFiltersProps {
  tecnicos: string[];
  frentes: string[];
  supervisores: string[];
  filters: KmFilterState;
  onFilterChange: (f: KmFilterState) => void;
  onClearFilters: () => void;
  onImport: () => void;
  onManualAdd: () => void;
}

const KmFilters: React.FC<KmFiltersProps> = ({
  tecnicos,
  frentes,
  supervisores,
  filters,
  onFilterChange,
  onClearFilters,
  onImport,
}) => {
  const activeCount = [
    filters.dataInicial ? 1 : 0,
    filters.dataFinal ? 1 : 0,
    filters.tecnicos.length,
    filters.frentes.length,
    filters.supervisores.length,
  ].reduce((sum, value) => sum + value, 0);
  const hasFilters = activeCount > 0;

  return (
    <section className="dashboard-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="size-4 text-primary" />
          Filtros
          {hasFilters && <Badge variant="secondary">{activeCount} ativos</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClearFilters} disabled={!hasFilters} className="cursor-pointer">
            <X />
            Limpar
          </Button>
          <Button size="sm" onClick={onImport} className="cursor-pointer">
            <Upload />
            Importar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="km-data-inicial" className="text-xs font-semibold uppercase text-muted-foreground">
            Data inicial
          </label>
          <Input
            id="km-data-inicial"
            type="date"
            value={filters.dataInicial}
            onChange={(e) => onFilterChange({ ...filters, dataInicial: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="km-data-final" className="text-xs font-semibold uppercase text-muted-foreground">
            Data final
          </label>
          <Input
            id="km-data-final"
            type="date"
            value={filters.dataFinal}
            onChange={(e) => onFilterChange({ ...filters, dataFinal: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="km-tecnicos" className="text-xs font-semibold uppercase text-muted-foreground">
            Técnico
          </label>
          <MultiSelectCombobox
            id="km-tecnicos"
            aria-label="Filtrar KM por técnico"
            options={tecnicos}
            selected={filters.tecnicos}
            onChange={(v) => onFilterChange({ ...filters, tecnicos: v })}
            placeholder="Todos os técnicos"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="km-supervisores" className="text-xs font-semibold uppercase text-muted-foreground">
            Supervisor
          </label>
          <MultiSelectCombobox
            id="km-supervisores"
            aria-label="Filtrar KM por supervisor"
            options={supervisores}
            selected={filters.supervisores}
            onChange={(v) => onFilterChange({ ...filters, supervisores: v })}
            placeholder="Todos os supervisores"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="km-frentes" className="text-xs font-semibold uppercase text-muted-foreground">
            Frente
          </label>
          <MultiSelectCombobox
            id="km-frentes"
            aria-label="Filtrar KM por frente"
            options={frentes}
            selected={filters.frentes}
            onChange={(v) => onFilterChange({ ...filters, frentes: v })}
            placeholder="Todas as frentes"
          />
        </div>
      </div>
    </section>
  );
};

export default KmFilters;
