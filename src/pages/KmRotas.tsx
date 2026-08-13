import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, ClipboardCheck, Fuel, Route, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import DashboardHeader from '@/components/DashboardHeader';
import DashboardLoadingState from '@/components/DashboardLoadingState';
import KPICard from '@/components/KPICard';
import KmChartsTab from '@/components/km/KmChartsTab';
import KmDataTab from '@/components/km/KmDataTab';
import KmFilters, { type KmFilterState } from '@/components/km/KmFilters';
import KmImportDialog from '@/components/km/KmImportDialog';
import KmManualDialog from '@/components/km/KmManualDialog';
import KmMapTab from '@/components/km/KmMapTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { formatDatePtBr, getCurrentMonthDateRange } from '@/lib/dateFilters';
import { isKmServiceOrder } from '@/lib/kmMetrics';
import { fetchKmMapRows, fetchKmSummaryRows, shouldRetryKmQuery } from '@/lib/kmQueries';
import { supabase } from '@/lib/supabase';
import type { DadoTecnico, KmTecnica, TransporteTecnico } from '@/types/database';

const createDefaultFilters = (): KmFilterState => ({
  ...getCurrentMonthDateRange(),
  tecnicos: [],
  frentes: [],
  supervisores: [],
});

const createTechnicianFilters = (tecnico = ''): KmFilterState => {
  const range = getCurrentMonthDateRange();

  return {
    dataInicial: range.dataInicial,
    dataFinal: range.dataFinal,
    tecnicos: tecnico ? [tecnico] : [],
    frentes: [],
    supervisores: [],
  };
};

const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index]);
const EMPTY_KM_ROWS: KmTecnica[] = [];
const EMPTY_TRANSPORTES: TransporteTecnico[] = [];
const EMPTY_DADOS_TECNICOS: DadoTecnico[] = [];

const KmRotas = () => {
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isTechnician = profile?.role === 'tecnico';
  const technicianLogin = isTechnician ? profile?.login_tecnico?.trim().toUpperCase() || '' : '';

  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('graficos');
  const [filters, setFilters] = useState<KmFilterState>(() =>
    isTechnician ? createTechnicianFilters() : createDefaultFilters(),
  );

  const canLoad = Boolean(
    selectedCity &&
    (isAdmin || isTechnician) &&
    (!isTechnician || technicianLogin),
  );

  const kmQuery = useQuery<KmTecnica[], Error>({
    queryKey: ['km-tecnica-resumo', selectedCity, technicianLogin, filters.dataInicial, filters.dataFinal],
    queryFn: ({ signal }) => fetchKmSummaryRows({
      cidade: selectedCity!,
      dataInicial: filters.dataInicial,
      dataFinal: filters.dataFinal,
      loginTecnico: technicianLogin || undefined,
      signal,
    }),
    enabled: canLoad,
    staleTime: 60_000,
    retry: shouldRetryKmQuery,
  });

  const transportesQuery = useQuery<TransporteTecnico[], Error>({
    queryKey: ['transporte-tecnico-km', technicianLogin],
    queryFn: async ({ signal }) => {
      let query = supabase
        .from('transporte_tecnico')
        .select('id,login,nome,transporte');

      if (technicianLogin) query = query.eq('login', technicianLogin);
      query = query.abortSignal(signal);

      const { data: rows, error } = await query;
      if (error) throw new Error(`Erro ao buscar transporte_tecnico: ${error.message}`);

      return (rows as TransporteTecnico[]) || [];
    },
    enabled: canLoad,
    staleTime: 5 * 60_000,
    retry: shouldRetryKmQuery,
  });

  const dadosTecnicosQuery = useQuery<DadoTecnico[], Error>({
    queryKey: ['dados-tecnicos-km', selectedCity, technicianLogin],
    queryFn: async ({ signal }) => {
      let query = supabase
        .from('dados_tecnicos')
        .select('login,nome,cidade,supervisor,ativo')
        .eq('cidade', selectedCity!)
        .eq('ativo', true);

      if (technicianLogin) query = query.eq('login', technicianLogin);
      query = query.abortSignal(signal);

      const { data: rows, error } = await query;
      if (error) throw new Error(`Erro ao buscar dados_tecnicos: ${error.message}`);

      return (rows as DadoTecnico[]) || [];
    },
    enabled: canLoad,
    staleTime: 5 * 60_000,
    retry: shouldRetryKmQuery,
  });

  const data = kmQuery.data ?? EMPTY_KM_ROWS;
  const transportes = transportesQuery.data ?? EMPTY_TRANSPORTES;
  const dadosTecnicos = dadosTecnicosQuery.data ?? EMPTY_DADOS_TECNICOS;
  const loadingData = canLoad && (kmQuery.isPending || transportesQuery.isPending || dadosTecnicosQuery.isPending);
  const queryError = kmQuery.error || transportesQuery.error || dadosTecnicosQuery.error;
  const loadError = isTechnician && !technicianLogin
    ? 'Seu perfil técnico ainda não tem login vinculado. Peça para um administrador ajustar seu cadastro.'
    : queryError?.message || '';

  useEffect(() => {
    if (!selectedCity) navigate('/selecionar-cidade', { replace: true });
  }, [navigate, selectedCity]);

  const transporteMap = useMemo(() => {
    const map = new Map<string, string>();
    transportes.forEach((t) => map.set(t.login.toUpperCase(), t.transporte?.toLowerCase() || 'carro'));
    return map;
  }, [transportes]);

  const supervisorMap = useMemo(() => {
    const map = new Map<string, string>();
    dadosTecnicos.forEach((d) => {
      if (d.login) map.set(d.login.toUpperCase(), d.supervisor || '');
    });
    return map;
  }, [dadosTecnicos]);

  const visibleData = useMemo(() => {
    const activeLogins = new Set(dadosTecnicos.map((tecnico) => tecnico.login.trim().toUpperCase()));
    return data.filter((row) => activeLogins.has(row.login_tecnico?.trim().toUpperCase() || ''));
  }, [data, dadosTecnicos]);

  const latestKmDate = useMemo(
    () => visibleData.reduce((latest, row) => (row.data > latest ? row.data : latest), ''),
    [visibleData],
  );
  const latestKmDateLabel = latestKmDate ? formatDatePtBr(latestKmDate) : '';

  const filteredData = useMemo(() => {
    let d = visibleData;

    if (filters.dataInicial) d = d.filter((r) => r.data >= filters.dataInicial);
    if (filters.dataFinal) d = d.filter((r) => r.data <= filters.dataFinal);
    if (!isTechnician && filters.tecnicos.length > 0) d = d.filter((r) => filters.tecnicos.includes(r.recurso));
    if (filters.frentes.length > 0) d = d.filter((r) => filters.frentes.includes(r.frente));
    if (filters.supervisores.length > 0) {
      d = d.filter((r) => filters.supervisores.includes(supervisorMap.get(r.login_tecnico?.toUpperCase() || '') || ''));
    }

    return d;
  }, [filters, isTechnician, supervisorMap, visibleData]);

  const tecnicos = useMemo(() => [...new Set(visibleData.map((d) => d.recurso))].sort(), [visibleData]);
  const technicianName = isTechnician ? tecnicos[0] || dadosTecnicos[0]?.nome || '' : '';
  const frentes = useMemo(() => [...new Set(visibleData.map((d) => d.frente).filter(Boolean))].sort(), [visibleData]);

  const supervisores = useMemo(() => {
    const set = new Set<string>();
    visibleData.forEach((d) => {
      const sup = supervisorMap.get(d.login_tecnico?.toUpperCase() || '');
      if (sup) set.add(sup);
    });
    return [...set].sort();
  }, [supervisorMap, visibleData]);

  const mapLogins = useMemo(
    () => [...new Set(filteredData.map((row) => row.login_tecnico).filter(Boolean))].sort(),
    [filteredData],
  );

  const shouldLoadMap = canLoad && activeTab === 'mapa' && filters.tecnicos.length > 0 && mapLogins.length > 0;
  const mapQuery = useQuery<KmTecnica[], Error>({
    queryKey: [
      'km-tecnica-mapa',
      selectedCity,
      filters.dataInicial,
      filters.dataFinal,
      mapLogins,
      filters.frentes,
    ],
    queryFn: ({ signal }) => fetchKmMapRows({
      cidade: selectedCity!,
      dataInicial: filters.dataInicial,
      dataFinal: filters.dataFinal,
      loginTecnico: technicianLogin || undefined,
      logins: mapLogins,
      frentes: filters.frentes,
      signal,
    }),
    enabled: shouldLoadMap,
    staleTime: 5 * 60_000,
    retry: shouldRetryKmQuery,
  });

  const mapData = mapQuery.data ?? EMPTY_KM_ROWS;

  const loadData = async () => {
    const requests = [kmQuery.refetch(), transportesQuery.refetch(), dadosTecnicosQuery.refetch()];
    if (shouldLoadMap) requests.push(mapQuery.refetch());
    await Promise.all(requests);
  };

  const totalKm = useMemo(() => filteredData.reduce((s, d) => s + (d.distancia_km || 0), 0), [filteredData]);
  const totalOS = useMemo(() => filteredData.filter(isKmServiceOrder).length, [filteredData]);
  const litrosEstimado = useMemo(() => {
    return filteredData.reduce((total, d) => {
      const km = d.distancia_km || 0;
      const tipo = transporteMap.get(d.login_tecnico?.toUpperCase() || '') || 'carro';
      const kmPorLitro = tipo === 'moto' ? 30 : 10;
      return total + km / kmPorLitro;
    }, 0);
  }, [filteredData, transporteMap]);

  useEffect(() => {
    if (!isTechnician || loadingData) return;

    setFilters((current) => {
      const defaults = createTechnicianFilters(technicianName);
      const nextFilters = {
        ...current,
        dataInicial: current.dataInicial || defaults.dataInicial,
        dataFinal: current.dataFinal || defaults.dataFinal,
        tecnicos: technicianName ? [technicianName] : current.tecnicos,
        supervisores: [],
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
  }, [isTechnician, loadingData, technicianName]);

  const applyTechnicianDefaults = (nextFilters: KmFilterState): KmFilterState => {
    if (!isTechnician) return nextFilters;

    const defaults = createTechnicianFilters(technicianName);
    return {
      ...nextFilters,
      dataInicial: nextFilters.dataInicial || defaults.dataInicial,
      dataFinal: nextFilters.dataFinal || defaults.dataFinal,
      tecnicos: technicianName ? [technicianName] : nextFilters.tecnicos,
      supervisores: [],
    };
  };

  const handleFilterChange = (nextFilters: KmFilterState) => {
    setFilters(applyTechnicianDefaults(nextFilters));
  };

  const clearFilters = () => setFilters(isTechnician ? createTechnicianFilters(technicianName) : createDefaultFilters());
  const hasActiveFilters = !!(filters.dataInicial || filters.dataFinal || filters.tecnicos.length > 0 || filters.frentes.length > 0 || filters.supervisores.length > 0);

  if (!selectedCity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Redirecionando...</span>
      </div>
    );
  }

  if (!isAdmin && !isTechnician) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <ShieldAlert className="mb-4 size-16 text-warning" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Acesso restrito</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Você não tem permissão para acessar esta página. Entre em contato com um administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="dashboard-container flex flex-col gap-4 sm:gap-5">
        {!loadingData && isTechnician && latestKmDate && (
          <div className="dashboard-panel flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <CalendarDays className="size-4 text-primary" />
            <span className="font-semibold text-foreground">
              Verifique seu KM, {technicianName || 'técnico'}
            </span>
            {/* <Badge variant="secondary">{latestKmDateLabel}</Badge> */}
            <span className="text-xs text-muted-foreground">
              Seu KM está atualizado até {latestKmDateLabel}.
            </span>
          </div>
        )}

        <KmFilters
          tecnicos={tecnicos}
          frentes={frentes}
          supervisores={supervisores}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onImport={() => setImportOpen(true)}
          onManualAdd={() => setManualOpen(true)}
          canImport={isAdmin}
          lockTechnicianFilter={isTechnician}
        />

        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loadingData ? (
          <DashboardLoadingState
            cards={3}
            title="Carregando KM e rotas"
            description="Buscando rotas, transportes e dados tecnicos antes de recalcular os totais."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 dashboard-grid-gap sm:grid-cols-3">
              <KPICard title="Qtd. de OS" value={String(totalOS)} icon={ClipboardCheck} color="primary" />
              <KPICard title="KM total" value={`${totalKm.toFixed(1)} km`} icon={Route} color="success" />
              <KPICard title="Litros estimados" value={`${litrosEstimado.toFixed(1)} L`} icon={Fuel} color="warning" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="h-auto w-full justify-start gap-1 border border-border bg-card p-1 sm:w-auto">
                <TabsTrigger value="graficos" className="text-xs sm:text-sm">Gráficos</TabsTrigger>
                <TabsTrigger value="mapa" className="text-xs sm:text-sm">Mapa</TabsTrigger>
                <TabsTrigger value="dados" className="text-xs sm:text-sm">Dados detalhados</TabsTrigger>
              </TabsList>

              <TabsContent value="graficos" className="mt-4">
                <KmChartsTab data={filteredData} transporteMap={transporteMap} hasActiveFilters={hasActiveFilters} />
              </TabsContent>
              <TabsContent value="mapa" className="mt-4">
                {mapQuery.isFetching && mapData.length === 0 ? (
                  <DashboardLoadingState
                    cards={1}
                    title="Carregando mapa"
                    description="Buscando apenas as coordenadas do período e dos técnicos selecionados."
                  />
                ) : mapQuery.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{mapQuery.error.message}</AlertDescription>
                  </Alert>
                ) : (
                  <KmMapTab data={mapData} selectedTecnicos={filters.tecnicos} />
                )}
              </TabsContent>
              <TabsContent value="dados" className="mt-4">
                <KmDataTab data={filteredData} transporteMap={transporteMap} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {isAdmin && (
        <>
          <KmImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={loadData} />
          <KmManualDialog open={manualOpen} onOpenChange={setManualOpen} onComplete={loadData} />
        </>
      )}
    </div>
  );
};

export default KmRotas;
