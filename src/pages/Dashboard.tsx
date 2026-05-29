import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFilters from '@/components/DashboardFilters';
import IndicatorTab from '@/components/IndicatorTab';
import SupervisorTab from '@/components/SupervisorTab';
import HorarioTab from '@/components/HorarioTab';
import ComparativoHroTab from '@/components/ComparativoHroTab';
import ResumoTab from '@/components/ResumoTab';
import ImportDialog from '@/components/ImportDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { IndicadorTecnico, HorarioPrimeiroCliente, IndicadorKey } from '@/types/database';
import { INDICADOR_LABELS } from '@/types/database';
import * as XLSX from 'xlsx';

const INDICATOR_KEYS: IndicadorKey[] = ['nr35', 'tnps', 'inspecao_e', 'revisita', 'os_dig', 'geo', 'ura', 'tec1', 'bds'];

const getStoredTab = (): string => {
  try {
    return localStorage.getItem('technet_active_tab') || 'resumo';
  } catch { return 'resumo'; }
};

const Dashboard = () => {
  const { profile } = useAuth();
  const { selectedCity } = useCity();
  const navigate = useNavigate();

  const [allIndicadores, setAllIndicadores] = useState<IndicadorTecnico[]>([]);
  const [allHorarios, setAllHorarios] = useState<HorarioPrimeiroCliente[]>([]);
  const [latestDate, setLatestDate] = useState<string>('');
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const [filters, setFilters] = useState({
    tecnicos: [] as string[],
    supervisores: [] as string[],
    dataInicial: '',
    dataFinal: '',
    busca: '',
  });

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
      return;
    }
    fetchData();
  }, [selectedCity]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    try { localStorage.setItem('technet_active_tab', value); } catch {}
  };

  const fetchData = async () => {
    if (!selectedCity) return;

    const fetchAll = async <T,>(table: 'indicadores_tecnicos' | 'horario_primeiro_cliente'): Promise<T[]> => {
      const PAGE = 1000;
      let from = 0;
      const all: T[] = [];
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('cidade', selectedCity)
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        all.push(...(data as T[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    };

    const [ind, hor] = await Promise.all([
      fetchAll<IndicadorTecnico>('indicadores_tecnicos'),
      fetchAll<HorarioPrimeiroCliente>('horario_primeiro_cliente'),
    ]);

    setAllIndicadores(ind);
    setAllHorarios(hor);

    // Detectar a data_referencia mais recente
    if (ind.length > 0) {
      const maxDate = ind.reduce((max, d) =>
        d.data_referencia > max ? d.data_referencia : max
      , ind[0].data_referencia);
      setLatestDate(maxDate);
    }
  };

  // Dados usados para popular listas de filtros (todos os dados, sem filtro de data)
  const indicadores = allIndicadores;
  const horarios = allHorarios;

  // Filter data
  const filteredData = useMemo(() => {
    let data = indicadores;
        if (filters.tecnicos.length > 0) {
      data = data.filter((d) => filters.tecnicos.includes(d.tecnico));
    }
     if (filters.supervisores.length > 0) {
      data = data.filter((d) => filters.supervisores.includes(d.supervisor));
    }
    if (filters.dataInicial) {
      data = data.filter((d) => d.data_referencia >= filters.dataInicial);
    }
    if (filters.dataFinal) {
      data = data.filter((d) => d.data_referencia <= filters.dataFinal);
    }
    if (filters.busca) {
      const q = filters.busca.toLowerCase();
      data = data.filter((d) =>
        d.tecnico.toLowerCase().includes(q) ||
        d.supervisor.toLowerCase().includes(q) ||
        d.login.toLowerCase().includes(q)
      );
    }
    return data;
  }, [indicadores, filters]);

  const filteredHorarios = useMemo(() => {
    let data = horarios;
      if (filters.tecnicos.length > 0) {
      data = data.filter((d) => filters.tecnicos.includes(d.tecnico));
    }
    if (filters.supervisores.length > 0) {
      data = data.filter((d) => filters.supervisores.includes(d.supervisor));
    }
    if (filters.dataInicial) {
      data = data.filter((d) => d.data_referencia >= filters.dataInicial);
    }
    if (filters.dataFinal) {
      data = data.filter((d) => d.data_referencia <= filters.dataFinal);
    }
    if (filters.busca) {
      const q = filters.busca.toLowerCase();
      data = data.filter((d) =>
        d.tecnico.toLowerCase().includes(q) ||
        d.supervisor.toLowerCase().includes(q) ||
        d.login.toLowerCase().includes(q)
      );
    }
    return data;
  }, [horarios, filters]);

  const tecnicos = useMemo(() => [...new Set(indicadores.map((d) => d.tecnico))].sort(), [indicadores]);
  const supervisores = useMemo(() => [...new Set(indicadores.map((d) => d.supervisor))].sort(), [indicadores]);

  const clearFilters = () => setFilters({ tecnicos: [], supervisores: [], dataInicial: '', dataFinal: '', busca: '' });

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technet_${selectedCity}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Indicadores');
    XLSX.writeFile(wb, `technet_${selectedCity}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isDateFiltered = !!filters.dataInicial || !!filters.dataFinal;

  if (!selectedCity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Redirecionando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {latestDate && (
          <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary rounded-lg px-4 py-2 border border-primary/20">
            <span className="font-medium">📅 Último envio no banco:</span>
            <span>{new Date(latestDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
            {!isDateFiltered && (
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full ml-1 font-semibold">Exibindo dados mais recentes por padrão (Gráficos mostram histórico)</span>
            )}
            {isDateFiltered && (
              <span className="text-xs text-muted-foreground ml-1">
                (exibindo período filtrado: {filters.dataInicial ? new Date(filters.dataInicial + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'início'}
                {' → '}
                {filters.dataFinal ? new Date(filters.dataFinal + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'fim'})
              </span>
            )}
          </div>
        )}

        <DashboardFilters
          tecnicos={tecnicos}
          supervisores={supervisores}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          onExportCSV={exportCSV}
          onExportExcel={exportExcel}
          onImport={() => setImportOpen(true)}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
            <TabsList className="inline-flex w-max sm:flex sm:flex-wrap sm:w-full h-auto gap-1 bg-card border border-border p-1">
              <TabsTrigger value="resumo" className="text-xs whitespace-nowrap">Resumo</TabsTrigger>
              {INDICATOR_KEYS.map((key) => (
                <TabsTrigger key={key} value={key} className="text-xs whitespace-nowrap">
                  {INDICADOR_LABELS[key]}
                </TabsTrigger>
              ))}
              <TabsTrigger value="horario" className="text-xs whitespace-nowrap">HORÁRIO</TabsTrigger>
              <TabsTrigger value="comparativo_hro" className="text-xs whitespace-nowrap">COMPARATIVO_HRO</TabsTrigger>
              <TabsTrigger value="supervisor" className="text-xs whitespace-nowrap">SUPERVISOR</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="resumo">
            <ResumoTab data={filteredData} cidade={selectedCity || ''} isDateFiltered={isDateFiltered} />
          </TabsContent>

          {INDICATOR_KEYS.map((key) => (
            <TabsContent key={key} value={key}>
              <IndicatorTab data={filteredData} indicatorKey={key} label={INDICADOR_LABELS[key]} isDateFiltered={isDateFiltered} />
            </TabsContent>
          ))}

          <TabsContent value="horario">
            <HorarioTab data={filteredHorarios} isDateFiltered={isDateFiltered} />
          </TabsContent>
          
          <TabsContent value="comparativo_hro">
            <ComparativoHroTab horarioData={filteredHorarios} />
          </TabsContent>

          <TabsContent value="supervisor">
            <SupervisorTab data={filteredData} isDateFiltered={isDateFiltered} />
          </TabsContent>
        </Tabs>
      </main>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={fetchData} />
    </div>
  );
};

export default Dashboard;
