import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import KmFilters, { type KmFilterState } from '@/components/km/KmFilters';
import KmImportDialog from '@/components/km/KmImportDialog';
import KmManualDialog from '@/components/km/KmManualDialog';
import KmMapTab from '@/components/km/KmMapTab';
import KmChartsTab from '@/components/km/KmChartsTab';
import KmDataTab from '@/components/km/KmDataTab';
import KPICard from '@/components/KPICard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Route, Fuel, ClipboardCheck, ShieldAlert } from 'lucide-react';
import type { KmTecnica, TransporteTecnico } from '@/types/database';

const KmRotas = () => {
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [data, setData] = useState<KmTecnica[]>([]);
  const [transportes, setTransportes] = useState<TransporteTecnico[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('graficos');
  const [filters, setFilters] = useState<KmFilterState>({
    dataInicial: '',
    dataFinal: '',
    tecnicos: [],
    frentes: [],
  });

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
      return;
    }
    fetchData();
    fetchTransportes();
  }, [selectedCity]);

  const fetchData = async () => {
    if (!selectedCity) return;
     let allRows: KmTecnica[] = [];
    let from = 0;
    const pageSize = 1000;
    let keepFetching = true;
    while (keepFetching) {
      const { data: rows } = await supabase
        .from('km_tecnica')
        .select('*')
        .eq('cidade', selectedCity)
        .range(from, from + pageSize - 1);
      const fetched = (rows as KmTecnica[]) || [];
      allRows = [...allRows, ...fetched];
      if (fetched.length < pageSize) {
        keepFetching = false;
      } else {
        from += pageSize;
      }
    }
    setData(allRows);
  };

   const fetchTransportes = async () => {
    const { data: rows } = await supabase
      .from('transporte_tecnico')
      .select('*');
    setTransportes((rows as TransporteTecnico[]) || []);
  };

  const transporteMap = useMemo(() => {
    const map = new Map<string, string>();
    transportes.forEach(t => map.set(t.login.toUpperCase(), t.transporte?.toLowerCase() || 'carro'));
    return map;
  }, [transportes]);

  const filteredData = useMemo(() => {
    let d = data;
    if (filters.dataInicial) d = d.filter(r => r.data >= filters.dataInicial);
    if (filters.dataFinal) d = d.filter(r => r.data <= filters.dataFinal);
    if (filters.tecnicos.length > 0) d = d.filter(r => filters.tecnicos.includes(r.recurso));
    if (filters.frentes.length > 0) d = d.filter(r => filters.frentes.includes(r.frente));
    return d;
  }, [data, filters]);

  const tecnicos = useMemo(() => [...new Set(data.map(d => d.recurso))].sort(), [data]);
  const frentes = useMemo(() => [...new Set(data.map(d => d.frente).filter(Boolean))].sort(), [data]);

  const totalKm = useMemo(() => filteredData.reduce((s, d) => s + (d.distancia_km || 0), 0), [filteredData]);
  const totalOS = filteredData.length;
  const litrosEstimado = useMemo(() => {
    return filteredData.reduce((total, d) => {
      const km = d.distancia_km || 0;
      const tipo = transporteMap.get(d.login_tecnico?.toUpperCase() || '') || 'carro';
      const kmPorLitro = tipo === 'moto' ? 30 : 10;
      return total + (km / kmPorLitro);
    }, 0);
  }, [filteredData, transporteMap]);

  const clearFilters = () => setFilters({ dataInicial: '', dataFinal: '', tecnicos: [], frentes: [] });

  if (!selectedCity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Redirecionando...</span>
      </div>
    );
  }
    if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <ShieldAlert className="h-16 w-16 text-warning mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Você não tem permissão para acessar esta página. Entre em contato com um Administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <KmFilters
          tecnicos={tecnicos}
          frentes={frentes}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          onImport={() => setImportOpen(true)}
          onManualAdd={() => setManualOpen(true)}
        />

        {/* KPIs principais */}
        <div className="grid grid-cols-3 gap-3">
          <KPICard title="Qtd. de OS" value={String(totalOS)} icon={ClipboardCheck} color="primary" />
          <KPICard title="KM Total" value={`${totalKm.toFixed(1)} km`} icon={Route} color="success" />
          <KPICard title="Litros Estimados" value={`${litrosEstimado.toFixed(1)} L`} icon={Fuel} color="warning" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto bg-card border border-border p-1">
            <TabsTrigger value="graficos" className="text-xs sm:text-sm">Gráficos</TabsTrigger>
            <TabsTrigger value="mapa" className="text-xs sm:text-sm">Mapa</TabsTrigger>
            <TabsTrigger value="dados" className="text-xs sm:text-sm">Dados Detalhados</TabsTrigger>
          </TabsList>

          <TabsContent value="graficos">
            <KmChartsTab data={filteredData} transporteMap={transporteMap} />
          </TabsContent>
          <TabsContent value="mapa">
            <KmMapTab data={filteredData} selectedTecnicos={filters.tecnicos} />
          </TabsContent>
          <TabsContent value="dados">
            <KmDataTab data={filteredData} transporteMap={transporteMap} />
          </TabsContent>
        </Tabs>
      </main>

      <KmImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={fetchData} />
      <KmManualDialog open={manualOpen} onOpenChange={setManualOpen} onComplete={fetchData} />
    </div>
  );
};

export default KmRotas;