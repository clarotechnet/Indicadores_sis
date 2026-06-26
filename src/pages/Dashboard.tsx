import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays } from 'lucide-react';
import * as XLSX from 'xlsx';

import ComparativoHroTab from '@/components/ComparativoHroTab';
import DashboardFilters, { type DashboardFilterState } from '@/components/DashboardFilters';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardLoadingState from '@/components/DashboardLoadingState';
import HorarioTab from '@/components/HorarioTab';
import ImportDialog from '@/components/ImportDialog';
import IndicatorTab from '@/components/IndicatorTab';
import ResumoTab from '@/components/ResumoTab';
import SupervisorTab from '@/components/SupervisorTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/lib/supabase';
import type { HorarioPrimeiroCliente, IndicadorKey, IndicadorTecnico } from '@/types/database';
import { INDICADOR_LABELS } from '@/types/database';

const INDICATOR_KEYS: IndicadorKey[] = ['nr35', 'tnps', 'inspecao_e', 'revisita', 'os_dig', 'geo', 'ura', 'tec1', 'bds'];
const TAB_TRIGGER_CLASS =
  'whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-sm';

const getStoredTab = (): string => {
  try {
    return localStorage.getItem('technet_active_tab') || 'resumo';
  } catch {
    return 'resumo';
  }
};

const Dashboard = () => {
  const { selectedCity } = useCity();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const technicianLogin = profile?.role === 'tecnico' ? profile.login_tecnico?.trim().toUpperCase() || '' : '';
  const isAdmin = profile?.role === 'admin';

  const [allIndicadores, setAllIndicadores] = useState<IndicadorTecnico[]>([]);
  const [allHorarios, setAllHorarios] = useState<HorarioPrimeiroCliente[]>([]);
  const [latestDate, setLatestDate] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const [filters, setFilters] = useState<DashboardFilterState>({
    tecnicos: [],
    supervisores: [],
    dataInicial: '',
    dataFinal: '',
    busca: '',
  });

  const fetchData = async () => {
    if (!selectedCity) {
      setLoadingData(false);
      return;
    }
    if (profile?.role === 'tecnico' && !technicianLogin) {
      setAllIndicadores([]);
      setAllHorarios([]);
      setLatestDate('');
      setLoadError('Seu perfil técnico ainda não tem login vinculado. Peça para um administrador ajustar seu cadastro.');
      setLoadingData(false);
      return;
    }

    setLoadError('');
    setLoadingData(true);

    const fetchAll = async <T,>(table: 'indicadores_tecnicos' | 'horario_primeiro_cliente'): Promise<T[]> => {
      const PAGE = 1000;
      let from = 0;
      const all: T[] = [];

      while (true) {
        let query = supabase
          .from(table)
          .select('*')
          .eq('cidade', selectedCity);

        if (technicianLogin) {
          query = query.eq('login', technicianLogin);
        }

        const { data, error } = await query
          .order('data_referencia', { ascending: true })
          .order('login', { ascending: true })
          .range(from, from + PAGE - 1);

        if (error) {
          throw new Error(`Erro ao buscar ${table}: ${error.message}`);
        }
        if (!data) break;

        all.push(...(data as T[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      return all;
    };

    const fetchActiveLogins = async (): Promise<Set<string>> => {
      let query = supabase
        .from('dados_tecnicos')
        .select('login')
        .eq('cidade', selectedCity)
        .eq('ativo', true);

      if (technicianLogin) {
        query = query.eq('login', technicianLogin);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Erro ao buscar tecnicos ativos: ${error.message}`);
      }

      return new Set((data || []).map((tecnico) => tecnico.login.trim().toUpperCase()));
    };

    try {
      const [ind, hor, activeLogins] = await Promise.all([
        fetchAll<IndicadorTecnico>('indicadores_tecnicos'),
        fetchAll<HorarioPrimeiroCliente>('horario_primeiro_cliente'),
        fetchActiveLogins(),
      ]);

      const activeIndicadores = ind.filter((row) => activeLogins.has(row.login.trim().toUpperCase()));
      const activeHorarios = hor.filter((row) => activeLogins.has(row.login.trim().toUpperCase()));

      setAllIndicadores(activeIndicadores);
      setAllHorarios(activeHorarios);

      if (activeIndicadores.length > 0) {
        const maxDate = activeIndicadores.reduce(
          (max, d) => (d.data_referencia > max ? d.data_referencia : max),
          activeIndicadores[0].data_referencia,
        );
        setLatestDate(maxDate);
      } else {
        setLatestDate('');
      }
    } catch (error) {
      setAllIndicadores([]);
      setAllHorarios([]);
      setLatestDate('');
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar dados do dashboard.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
      return;
    }
    fetchData();
  }, [selectedCity, profile?.role, profile?.login_tecnico]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    try {
      localStorage.setItem('technet_active_tab', value);
    } catch {
      // Ignore localStorage errors when storage is unavailable.
    }
  };

  const indicadores = allIndicadores;
  const horarios = allHorarios;

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
        d.login.toLowerCase().includes(q),
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
        d.login.toLowerCase().includes(q),
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Redirecionando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="dashboard-container flex flex-col gap-4 sm:gap-5">
        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {!loadingData && latestDate && (
          <div className="dashboard-panel flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <CalendarDays className="size-4 text-primary" />
            <span className="font-semibold text-foreground">Último envio no banco</span>
            <Badge variant="secondary">
              {new Date(latestDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </Badge>
            {!isDateFiltered && (
              <span className="text-xs text-muted-foreground">Dados recentes por padrão. Gráficos preservam o histórico.</span>
            )}
            {isDateFiltered && (
              <span className="text-xs text-muted-foreground">
                Período filtrado: {filters.dataInicial ? new Date(filters.dataInicial + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'início'}
                {' até '}
                {filters.dataFinal ? new Date(filters.dataFinal + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'fim'}
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
          canImport={isAdmin}
        />

        {loadingData ? (
          <DashboardLoadingState
            title="Carregando indicadores"
            description="Buscando os dados da cidade selecionada antes de atualizar os cards e graficos."
          />
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto w-max justify-start gap-3 rounded-none border-b border-border bg-transparent p-0 sm:flex sm:w-full sm:flex-wrap">
                <TabsTrigger value="resumo" className={TAB_TRIGGER_CLASS}>
                  Visão Geral
                </TabsTrigger>
                {INDICATOR_KEYS.map((key) => (
                  <TabsTrigger key={key} value={key} className={TAB_TRIGGER_CLASS}>
                    {INDICADOR_LABELS[key]}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="horario" className={TAB_TRIGGER_CLASS}>
                  Horário
                </TabsTrigger>
                <TabsTrigger value="comparativo_hro" className={TAB_TRIGGER_CLASS}>
                  Comparativo HRO
                </TabsTrigger>
                <TabsTrigger value="supervisor" className={TAB_TRIGGER_CLASS}>
                  Supervisor
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumo" className="mt-4">
              <ResumoTab data={filteredData} cidade={selectedCity || ''} isDateFiltered={isDateFiltered} />
            </TabsContent>

            {INDICATOR_KEYS.map((key) => (
              <TabsContent key={key} value={key} className="mt-4">
                <IndicatorTab data={filteredData} indicatorKey={key} label={INDICADOR_LABELS[key]} isDateFiltered={isDateFiltered} />
              </TabsContent>
            ))}

            <TabsContent value="horario" className="mt-4">
              <HorarioTab data={filteredHorarios} isDateFiltered={isDateFiltered} />
            </TabsContent>

            <TabsContent value="comparativo_hro" className="mt-4">
              <ComparativoHroTab horarioData={filteredHorarios} />
            </TabsContent>

            <TabsContent value="supervisor" className="mt-4">
              <SupervisorTab data={filteredData} isDateFiltered={isDateFiltered} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {isAdmin && <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={fetchData} />}
    </div>
  );
};

export default Dashboard;
