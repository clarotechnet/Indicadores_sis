import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ClipboardCheck, Fuel, Route, ShieldAlert } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { isKmServiceOrder } from '@/lib/kmMetrics';
import { supabase } from '@/lib/supabase';
import type { DadoTecnico, KmTecnica, TransporteTecnico } from '@/types/database';

const KmRotas = () => {
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isTechnician = profile?.role === 'tecnico';
  const technicianLogin = isTechnician ? profile?.login_tecnico?.trim().toUpperCase() || '' : '';

  const [data, setData] = useState<KmTecnica[]>([]);
  const [transportes, setTransportes] = useState<TransporteTecnico[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [dadosTecnicos, setDadosTecnicos] = useState<DadoTecnico[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('graficos');
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState<KmFilterState>({
    dataInicial: '',
    dataFinal: '',
    tecnicos: [],
    frentes: [],
    supervisores: [],
  });

  const fetchKmData = async (): Promise<KmTecnica[]> => {
    if (!selectedCity) return [];

    let allRows: KmTecnica[] = [];
    let from = 0;
    const pageSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
      let query = supabase
        .from('km_tecnica')
        .select('*')
        .eq('cidade', selectedCity);

      if (technicianLogin) {
        query = query.eq('login_tecnico', technicianLogin);
      }

      const { data: rows, error } = await query
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Erro ao buscar km_tecnica: ${error.message}`);
      }

      const fetched = (rows as KmTecnica[]) || [];
      allRows = [...allRows, ...fetched];

      if (fetched.length < pageSize) {
        keepFetching = false;
      } else {
        from += pageSize;
      }
    }

    return allRows;
  };

  const fetchTransportes = async (): Promise<TransporteTecnico[]> => {
    let query = supabase.from('transporte_tecnico').select('*');

    if (technicianLogin) {
      query = query.eq('login', technicianLogin);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar transporte_tecnico: ${error.message}`);
    }

    return (rows as TransporteTecnico[]) || [];
  };

  const fetchDadosTecnicos = async (): Promise<DadoTecnico[]> => {
    if (!selectedCity) return [];

    let query = supabase
      .from('dados_tecnicos')
      .select('*')
      .eq('cidade', selectedCity);

    if (technicianLogin) {
      query = query.eq('login', technicianLogin);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar dados_tecnicos: ${error.message}`);
    }

    return (rows as DadoTecnico[]) || [];
  };

  const loadData = async () => {
    if (!selectedCity) {
      setLoadingData(false);
      return;
    }
    if (isTechnician && !technicianLogin) {
      setData([]);
      setTransportes([]);
      setDadosTecnicos([]);
      setLoadError('Seu perfil técnico ainda não tem login vinculado. Peça para um administrador ajustar seu cadastro.');
      setLoadingData(false);
      return;
    }

    setLoadError('');
    setLoadingData(true);

    try {
      const [kmRows, transporteRows, tecnicoRows] = await Promise.all([
        fetchKmData(),
        fetchTransportes(),
        fetchDadosTecnicos(),
      ]);

      setData(kmRows);
      setTransportes(transporteRows);
      setDadosTecnicos(tecnicoRows);
    } catch (error) {
      setData([]);
      setTransportes([]);
      setDadosTecnicos([]);
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar dados de KM.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
      return;
    }

    loadData();
  }, [selectedCity, profile?.role, profile?.login_tecnico]);

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

  const filteredData = useMemo(() => {
    let d = data;

    if (filters.dataInicial) d = d.filter((r) => r.data >= filters.dataInicial);
    if (filters.dataFinal) d = d.filter((r) => r.data <= filters.dataFinal);
    if (filters.tecnicos.length > 0) d = d.filter((r) => filters.tecnicos.includes(r.recurso));
    if (filters.frentes.length > 0) d = d.filter((r) => filters.frentes.includes(r.frente));
    if (filters.supervisores.length > 0) {
      d = d.filter((r) => filters.supervisores.includes(supervisorMap.get(r.login_tecnico?.toUpperCase() || '') || ''));
    }

    return d;
  }, [data, filters, supervisorMap]);

  const tecnicos = useMemo(() => [...new Set(data.map((d) => d.recurso))].sort(), [data]);
  const frentes = useMemo(() => [...new Set(data.map((d) => d.frente).filter(Boolean))].sort(), [data]);

  const supervisores = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => {
      const sup = supervisorMap.get(d.login_tecnico?.toUpperCase() || '');
      if (sup) set.add(sup);
    });
    return [...set].sort();
  }, [data, supervisorMap]);

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

  const clearFilters = () => setFilters({ dataInicial: '', dataFinal: '', tecnicos: [], frentes: [], supervisores: [] });
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
        <KmFilters
          tecnicos={tecnicos}
          frentes={frentes}
          supervisores={supervisores}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          onImport={() => setImportOpen(true)}
          onManualAdd={() => setManualOpen(true)}
          canImport={isAdmin}
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
                <KmMapTab data={filteredData} selectedTecnicos={filters.tecnicos} />
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
