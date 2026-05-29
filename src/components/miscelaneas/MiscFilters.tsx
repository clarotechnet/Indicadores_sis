import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Upload, Filter, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import MultiSelectCombobox from '@/components/MultiSelectCombobox';
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
  supervisores, tecnicos, filters, onFilterChange, onClearFilters, onImport
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const hasActiveFilters = filters.mes || filters.supervisores.length > 0 || filters.tecnicos.length > 0;

  const filterContent = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          type="month"
          value={filters.mes}
          onChange={(e) => onFilterChange({ ...filters, mes: e.target.value })}
          placeholder="Mês"
        />
        <MultiSelectCombobox
          options={supervisores}
          selected={filters.supervisores}
          onChange={(v) => onFilterChange({ ...filters, supervisores: v })}
          placeholder="Supervisor"
        />
        <MultiSelectCombobox
          options={tecnicos}
          selected={filters.tecnicos}
          onChange={(v) => onFilterChange({ ...filters, tecnicos: v })}
          placeholder="Técnico"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClearFilters} className="flex-1">
            <X className="h-4 w-4" /> Limpar
          </Button>
          <Button size="sm" onClick={onImport} className="flex-1">
            <Upload className="h-4 w-4" /> Importar
          </Button>
        </div>
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
                {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">{filterContent}</CollapsibleContent>
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

export default MiscFilters;