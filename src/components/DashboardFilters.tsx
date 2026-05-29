import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, X, Download, Upload, Filter, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import MultiSelectCombobox from '@/components/MultiSelectCombobox';

interface DashboardFiltersProps {
  tecnicos: string[];
  supervisores: string[];
  filters: {
   tecnicos: string[];
    supervisores: string[];
    dataInicial: string;
    dataFinal: string;
    busca: string;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onImport: () => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  tecnicos, supervisores, filters, onFilterChange, onClearFilters, onExportCSV, onExportExcel, onImport
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);

  const hasActiveFilters = filters.tecnicos.length > 0 || filters.supervisores.length > 0 || filters.dataInicial || filters.dataFinal || filters.busca;

  const filterContent = (
    <>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-700">Técnico</label>
         <MultiSelectCombobox
          options={tecnicos}
          selected={filters.tecnicos}
          onChange={(v) => onFilterChange({ ...filters, tecnicos: v })}
          placeholder="Técnico"
        />
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-700">Supervisor</label>
          <MultiSelectCombobox
          options={supervisores}
          selected={filters.supervisores}
          onChange={(v) => onFilterChange({ ...filters, supervisores: v })}
          placeholder="Supervisor"
        />
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-700">Data inicial</label>
    <Input
      type="date"
      value={filters.dataInicial}
      onChange={(e) => onFilterChange({ ...filters, dataInicial: e.target.value })}
    />
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-700">Data final</label>
    <Input
      type="date"
      value={filters.dataFinal}
      onChange={(e) => onFilterChange({ ...filters, dataFinal: e.target.value })}
    />
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-700">Busca</label>
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Busca geral..."
        value={filters.busca}
        onChange={(e) => onFilterChange({ ...filters, busca: e.target.value })}
        className="pl-9"
      />
    </div>
  </div>
</div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4" /> Limpar
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onExportExcel}>
          <Download className="h-4 w-4" /> Excel
        </Button>
        <Button size="sm" onClick={onImport}>
          <Upload className="h-4 w-4" /> Importar
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="bg-card rounded-lg border border-border p-3 shadow-sm space-y-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-sm font-medium text-foreground">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros
                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            {filterContent}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="h-4 w-4 text-primary" />
        Filtros
      </div>
      {filterContent}
    </div>
  );
};

export default DashboardFilters;
