import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import MiscFilters from '@/components/miscelaneas/MiscFilters';
import MiscGraficos from '@/components/miscelaneas/MiscGraficos';
import MiscImportDialog from '@/components/miscelaneas/MiscImportDialog';
import MiscPainelGeral from '@/components/miscelaneas/MiscPainelGeral';
import MiscPainelTecnico from '@/components/miscelaneas/MiscPainelTecnico';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/lib/supabase';
import type { DadoTecnico } from '@/types/database';

export interface ExcessoMiscelanea {
  id: string;
  data_execucao: string;
  numero_wo: string;
  contrato: string;
  os: string;
  servico: string;
  qtde: number;
  grupo: string;
  codigo: string;
  equipamento: string;
  tecnico: string;
  controlador: string;
  tipo_servico: string;
  cidade: string;
  created_at: string;
}

export interface MiscFilterState {
  mes: string;
  supervisores: string[];
  tecnicos: string[];
}

const ExcessoMiscelaneas = () => {
  const { selectedCity } = useCity();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ExcessoMiscelanea[]>([]);
  const [dadosTecnicos, setDadosTecnicos] = useState<DadoTecnico[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('painel-geral');
  const [filters, setFilters] = useState<MiscFilterState>({
    mes: '',
    supervisores: [],
    tecnicos: [],
  });

  const fetchData = async () => {
    if (!selectedCity) return;

    const { data: rows } = await supabase
      .from('excesso_miscelaneas')
      .select('*')
      .eq('cidade', selectedCity);

    setData((rows as ExcessoMiscelanea[]) || []);
  };

  const fetchDadosTecnicos = async () => {
    if (!selectedCity) return;

    const { data: rows } = await supabase
      .from('dados_tecnicos')
      .select('*')
      .eq('cidade', selectedCity);

    setDadosTecnicos((rows as DadoTecnico[]) || []);
  };

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
      return;
    }

    fetchData();
    fetchDadosTecnicos();
  }, [selectedCity]);

  const tecnicoSupervisorMap = useMemo(() => {
    const map = new Map<string, string>();
    dadosTecnicos.forEach((d) => map.set(d.nome.toUpperCase(), d.supervisor));
    return map;
  }, [dadosTecnicos]);

  const filteredData = useMemo(() => {
    let d = data;

    if (filters.mes) {
      d = d.filter((r) => r.data_execucao?.startsWith(filters.mes));
    }
    if (filters.supervisores.length > 0) {
      d = d.filter((r) => {
        const sup = tecnicoSupervisorMap.get(r.tecnico?.toUpperCase() || '');
        return sup && filters.supervisores.includes(sup);
      });
    }
    if (filters.tecnicos.length > 0) {
      d = d.filter((r) => filters.tecnicos.includes(r.tecnico));
    }

    return d;
  }, [data, filters, tecnicoSupervisorMap]);

  const supervisores = useMemo(() => [...new Set(dadosTecnicos.map((d) => d.supervisor))].sort(), [dadosTecnicos]);
  const tecnicos = useMemo(() => [...new Set(data.map((d) => d.tecnico).filter(Boolean))].sort(), [data]);

  if (!selectedCity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Redirecionando...</span>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
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
        <MiscFilters
          supervisores={supervisores}
          tecnicos={tecnicos}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={() => setFilters({ mes: '', supervisores: [], tecnicos: [] })}
          onImport={() => setImportOpen(true)}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto w-full justify-start gap-1 border border-border bg-card p-1 sm:w-auto">
            <TabsTrigger value="painel-geral" className="text-xs sm:text-sm">Painel geral</TabsTrigger>
            <TabsTrigger value="painel-tecnico" className="text-xs sm:text-sm">Painel técnico</TabsTrigger>
            <TabsTrigger value="graficos" className="text-xs sm:text-sm">Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="painel-geral" className="mt-4">
            <MiscPainelGeral data={filteredData} dadosTecnicos={dadosTecnicos} tecnicoSupervisorMap={tecnicoSupervisorMap} />
          </TabsContent>
          <TabsContent value="painel-tecnico" className="mt-4">
            <MiscPainelTecnico data={filteredData} tecnicos={tecnicos} />
          </TabsContent>
          <TabsContent value="graficos" className="mt-4">
            <MiscGraficos data={filteredData} />
          </TabsContent>
        </Tabs>
      </main>

      <MiscImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={fetchData} cidade={selectedCity} />
    </div>
  );
};

export default ExcessoMiscelaneas;
