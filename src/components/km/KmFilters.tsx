import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MultiSelectCombobox from '@/components/MultiSelectCombobox';
import { Upload, Plus, X, Download } from 'lucide-react';

export interface KmFilterState {
  dataInicial: string;
  dataFinal: string;
  tecnicos: string[];
  frentes: string[];
}

interface KmFiltersProps {
  tecnicos: string[];
  frentes: string[];
  filters: KmFilterState;
  onFilterChange: (f: KmFilterState) => void;
  onClearFilters: () => void;
  onImport: () => void;
  onManualAdd: () => void;
}

const KmFilters: React.FC<KmFiltersProps> = ({
  tecnicos, frentes, filters, onFilterChange, onClearFilters, onImport, onManualAdd,
}) => {
  const hasFilters = filters.dataInicial || filters.dataFinal || filters.tecnicos.length > 0 || filters.frentes.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4 mr-1" /> Importar
        </Button>
        {/* <Button size="sm" variant="outline" onClick={onManualAdd}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button> */}
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className='flex flex-col gap-2'>
        <label className='text-sm font-medium text-gray-700'>Data inicial</label>
        <Input
          type="date"
          value={filters.dataInicial}
          onChange={e => onFilterChange({ ...filters, dataInicial: e.target.value })}
          placeholder="Data inicial"
          className="text-sm"
        />
        </div>
        <div className='flex flex-col gap-2'>
            <label className='text-sm font-medium text-gray-700'>Data Final</label>
        <Input
          type="date"
          value={filters.dataFinal}
          onChange={e => onFilterChange({ ...filters, dataFinal: e.target.value })}
          placeholder="Data final"
          className="text-sm"
        />
        </div>
        <div className='flex flex-col gap-2'>
        <label className='text-sm font-medium text-gray-700'>Técnico</label>
        <MultiSelectCombobox
          options={tecnicos}
          selected={filters.tecnicos}
          onChange={v => onFilterChange({ ...filters, tecnicos: v })}
          placeholder="Técnicos"
        />
        </div>
        <div className='flex flex-col gap-2'>
        <label className='text-sm font-medium text-gray-700'>Frente</label>
        <MultiSelectCombobox
          options={frentes}
          selected={filters.frentes}
          onChange={v => onFilterChange({ ...filters, frentes: v })}
          placeholder="Frente"
        />
        </div>
      </div>
    </div>
  );
};

export default KmFilters;