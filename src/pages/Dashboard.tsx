import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import TecnicoOverview from '@/components/TecnicoOverview';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import {
  applyActiveTechnicianMetadata,
  fetchActiveDashboardTechnicians,
  fetchIndicatorRows,
  fetchScheduleRows,
  shouldRetryDashboardQuery,
} from '@/lib/dashboardQueries';
import { formatDatePtBr, getCurrentMonthDateRange } from '@/lib/dateFilters';
import type { DadoTecnico, HorarioPrimeiroCliente, IndicadorKey, IndicadorTecnico } from '@/types/database';
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

const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index]);
const EMPTY_INDICATORS: IndicadorTecnico[] = [];
const EMPTY_SCHEDULES: HorarioPrimeiroCliente[] = [];
const EMPTY_TECHNICIANS: DadoTecnico[] = [];

const createEmptyFilters = (): DashboardFilterState => ({
  tecnicos: [],
  supervisores: [],
  dataInicial: '',
  dataFinal: '',
  busca: '',
});

const createTechnicianFilters = (tecnico = ''): DashboardFilterState => {
  const range = getCurrentMonthDateRange();

  return {
    tecnicos: tecnico ? [tecnico] : [],
    supervisores: [],
    dataInicial: range.dataInicial,
    dataFinal: range.dataFinal,
    busca: '',
  };
};

const Dashboard = () => {
  const { selectedCity } = useCity();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const technicianLogin = profile?.role === 'tecnico' ? profile.login_tecnico?.trim().toUpperCase() || '' : '';
  const isAdmin = profile?.role === 'admin';
  const isTechnicianDashboard = profile?.role === 'tecnico' && !!technicianLogin;

  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const [filters, setFilters] = useState<DashboardFilterState>(() =>
    isTechnicianDashboard ? createTechnicianFilters() : createEmptyFilters(),
  );

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
    }
  }, [navigate, selectedCity]);

  const canLoad = Boolean(
    selectedCity && profile && (profile.role !== 'tecnico' || technicianLogin),
  );
  const shouldLoadSchedules = canLoad && (
    isTechnicianDashboard || activeTab === 'horario' || activeTab === 'comparativo_hro'
  );
  const queryDateRange = isTechnicianDashboard
    ? { dataInicial: filters.dataInicial, dataFinal: filters.dataFinal }
    : { dataInicial: undefined, dataFinal: undefined };

  const techniciansQuery = useQuery<DadoTecnico[], Error>({
    queryKey: ['dashboard-tecnicos-ativos', selectedCity, profile?.id, technicianLogin],
    queryFn: ({ signal }) => fetchActiveDashboardTechnicians({
      cidade: selectedCity!,
      loginTecnico: technicianLogin || undefined,
      signal,
    }),
    enabled: canLoad,
    staleTime: 60_000,
    retry: shouldRetryDashboardQuery,
  });

  const indicatorsQuery = useQuery<IndicadorTecnico[], Error>({
    queryKey: [
      'dashboard-indicadores',
      selectedCity,
      profile?.id,
      technicianLogin,
      queryDateRange.dataInicial,
      queryDateRange.dataFinal,
    ],
    queryFn: ({ signal }) => fetchIndicatorRows({
      cidade: selectedCity!,
      loginTecnico: technicianLogin || undefined,
      dataInicial: queryDateRange.dataInicial,
      dataFinal: queryDateRange.dataFinal,
      signal,
    }),
    enabled: canLoad,
    staleTime: 60_000,
    retry: shouldRetryDashboardQuery,
  });

  const schedulesQuery = useQuery<HorarioPrimeiroCliente[], Error>({
    queryKey: [
      'dashboard-horarios',
      selectedCity,
      profile?.id,
      technicianLogin,
      queryDateRange.dataInicial,
      queryDateRange.dataFinal,
    ],
    queryFn: ({ signal }) => fetchScheduleRows({
      cidade: selectedCity!,
      loginTecnico: technicianLogin || undefined,
      dataInicial: queryDateRange.dataInicial,
      dataFinal: queryDateRange.dataFinal,
      signal,
    }),
    enabled: shouldLoadSchedules,
    staleTime: 60_000,
    retry: shouldRetryDashboardQuery,
  });

  const activeTechnicians = techniciansQuery.data ?? EMPTY_TECHNICIANS;
  const indicadores = useMemo(
    () => applyActiveTechnicianMetadata(indicatorsQuery.data ?? EMPTY_INDICATORS, activeTechnicians),
    [activeTechnicians, indicatorsQuery.data],
  );
  const horarios = useMemo(
    () => applyActiveTechnicianMetadata(schedulesQuery.data ?? EMPTY_SCHEDULES, activeTechnicians),
    [activeTechnicians, schedulesQuery.data],
  );
  const latestDate = useMemo(
    () => indicadores.reduce((latest, row) => (row.data_referencia > latest ? row.data_referencia : latest), ''),
    [indicadores],
  );
  const technicianName = isTechnicianDashboard ? activeTechnicians[0]?.nome || '' : '';
  const loadingData = canLoad && (
    techniciansQuery.isPending ||
    indicatorsQuery.isPending ||
    (isTechnicianDashboard && schedulesQuery.isPending)
  );
  const queryError = techniciansQuery.error || indicatorsQuery.error || (shouldLoadSchedules ? schedulesQuery.error : null);
  const loadError = profile?.role === 'tecnico' && !technicianLogin
    ? 'Seu perfil técnico ainda não tem login vinculado. Peça para um administrador ajustar seu cadastro.'
    : queryError?.message || '';

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    try {
      localStorage.setItem('technet_active_tab', value);
    } catch {
      // Ignore localStorage errors when storage is unavailable.
    }
  };

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

  const supervisores = useMemo(
    () => [...new Set(activeTechnicians.map((d) => d.supervisor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [activeTechnicians],
  );
  const tecnicos = useMemo(() => {
    const selectedSupervisors = new Set(filters.supervisores);

    return [
      ...new Set(
        activeTechnicians
          .filter((tecnico) => selectedSupervisors.size === 0 || selectedSupervisors.has(tecnico.supervisor))
          .map((tecnico) => tecnico.nome)
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [activeTechnicians, filters.supervisores]);

  useEffect(() => {
    if (loadingData) return;

    setFilters((current) => {
      const supervisorOptions = new Set(supervisores);
      const tecnicoOptions = new Set(tecnicos);
      const nextSupervisores = current.supervisores.filter((supervisor) => supervisorOptions.has(supervisor));
      const nextTecnicos = current.tecnicos.filter((tecnico) => tecnicoOptions.has(tecnico));

      if (sameItems(current.supervisores, nextSupervisores) && sameItems(current.tecnicos, nextTecnicos)) {
        return current;
      }

      return {
        ...current,
        supervisores: nextSupervisores,
        tecnicos: nextTecnicos,
      };
    });
  }, [loadingData, supervisores, tecnicos]);

  useEffect(() => {
    if (!isTechnicianDashboard || loadingData) return;

    setFilters((current) => {
      const defaults = createTechnicianFilters(technicianName);
      const nextFilters = {
        ...current,
        tecnicos: technicianName ? [technicianName] : current.tecnicos,
        supervisores: [],
        dataInicial: current.dataInicial || defaults.dataInicial,
        dataFinal: current.dataFinal || defaults.dataFinal,
      };

      if (
        current.dataInicial === nextFilters.dataInicial &&
        current.dataFinal === nextFilters.dataFinal &&
        sameItems(current.tecnicos, nextFilters.tecnicos) &&
        sameItems(current.supervisores, nextFilters.supervisores)
      ) {
        return current;
      }

      return nextFilters;
    });
  }, [isTechnicianDashboard, loadingData, technicianName]);

  const applyTechnicianDefaults = (nextFilters: DashboardFilterState): DashboardFilterState => {
    if (!isTechnicianDashboard) return nextFilters;

    const defaults = createTechnicianFilters(technicianName);
    return {
      ...nextFilters,
      tecnicos: technicianName ? [technicianName] : nextFilters.tecnicos,
      supervisores: [],
      dataInicial: nextFilters.dataInicial || defaults.dataInicial,
      dataFinal: nextFilters.dataFinal || defaults.dataFinal,
    };
  };

  const handleFilterChange = (nextFilters: DashboardFilterState) => {
    setFilters(applyTechnicianDefaults(nextFilters));
  };

  const clearFilters = () => setFilters(isTechnicianDashboard ? createTechnicianFilters(technicianName) : createEmptyFilters());

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-tecnicos-ativos', selectedCity] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-indicadores', selectedCity] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-horarios', selectedCity] }),
    ]);
  };

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
  const latestDateLabel = latestDate ? formatDatePtBr(latestDate) : '';

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
            {isTechnicianDashboard ? (
              <>
                <span className="font-semibold text-foreground">
                  Bem-vindo, técnico {technicianName || 'logado'}
                </span>
                {/* <Badge variant="secondary">{latestDateLabel}</Badge> */}
                <span className="text-xs text-muted-foreground">
                  Seus indicadores estão atualizados até {latestDateLabel}.
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">Último envio no banco</span>
                <Badge variant="secondary">{latestDateLabel}</Badge>
                {!isDateFiltered && (
                  <span className="text-xs text-muted-foreground">Dados recentes por padrão. Gráficos preservam o histórico.</span>
                )}
                {isDateFiltered && (
                  <span className="text-xs text-muted-foreground">
                    Período filtrado: {filters.dataInicial ? formatDatePtBr(filters.dataInicial) : 'início'}
                    {' até '}
                    {filters.dataFinal ? formatDatePtBr(filters.dataFinal) : 'fim'}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        <DashboardFilters
          tecnicos={tecnicos}
          supervisores={supervisores}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onExportCSV={exportCSV}
          onExportExcel={exportExcel}
          onImport={() => setImportOpen(true)}
          canImport={isAdmin}
          lockTechnicianFilter={isTechnicianDashboard}
        />

        {loadingData ? (
          <DashboardLoadingState
            title="Carregando indicadores"
            description="Buscando os dados da cidade selecionada antes de atualizar os cards e graficos."
          />
        ) : isTechnicianDashboard ? (
          <TecnicoOverview
            data={filteredData}
            horarioData={filteredHorarios}
            cidade={selectedCity || ''}
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
              {schedulesQuery.isPending ? (
                <DashboardLoadingState
                  cards={4}
                  title="Carregando horários"
                  description="Buscando os horários da cidade selecionada."
                />
              ) : (
                <HorarioTab data={filteredHorarios} isDateFiltered={isDateFiltered} />
              )}
            </TabsContent>

            <TabsContent value="comparativo_hro" className="mt-4">
              {schedulesQuery.isPending ? (
                <DashboardLoadingState
                  cards={2}
                  title="Carregando comparativo HRO"
                  description="Buscando os horários necessários para o comparativo."
                />
              ) : (
                <ComparativoHroTab horarioData={filteredHorarios} />
              )}
            </TabsContent>

            <TabsContent value="supervisor" className="mt-4">
              <SupervisorTab data={filteredData} isDateFiltered={isDateFiltered} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {isAdmin && <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={refreshData} />}
    </div>
  );
};

export default Dashboard;
