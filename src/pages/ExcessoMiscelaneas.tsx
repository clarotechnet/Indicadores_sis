import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldAlert } from 'lucide-react';
import MiscPainelGeral from '@/components/miscelaneas/MiscPainelGeral';
import MiscPainelTecnico from '@/components/miscelaneas/MiscPainelTecnico';
import MiscGraficos from '@/components/miscelaneas/MiscGraficos';
import MiscFilters from '@/components/miscelaneas/MiscFilters';
import MiscImportDialog from '@/components/miscelaneas/MiscImportDialog';
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

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
      return;
    }
    fetchData();
    fetchDadosTecnicos();
  }, [selectedCity]);

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

  // Map tecnico name -> supervisor
  const tecnicoSupervisorMap = useMemo(() => {
    const map = new Map<string, string>();
    dadosTecnicos.forEach(d => map.set(d.nome.toUpperCase(), d.supervisor));
    return map;
  }, [dadosTecnicos]);

  const filteredData = useMemo(() => {
    let d = data;
    if (filters.mes) {
      d = d.filter(r => r.data_execucao?.startsWith(filters.mes));
    }
    if (filters.supervisores.length > 0) {
      d = d.filter(r => {
        const sup = tecnicoSupervisorMap.get(r.tecnico?.toUpperCase() || '');
        return sup && filters.supervisores.includes(sup);
      });
    }
    if (filters.tecnicos.length > 0) {
      d = d.filter(r => filters.tecnicos.includes(r.tecnico));
    }
    return d;
  }, [data, filters, tecnicoSupervisorMap]);

  const supervisores = useMemo(() => [...new Set(dadosTecnicos.map(d => d.supervisor))].sort(), [dadosTecnicos]);
  const tecnicos = useMemo(() => [...new Set(data.map(d => d.tecnico).filter(Boolean))].sort(), [data]);

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
        <MiscFilters
          supervisores={supervisores}
          tecnicos={tecnicos}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={() => setFilters({ mes: '', supervisores: [], tecnicos: [] })}
          onImport={() => setImportOpen(true)}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto bg-card border border-border p-1">
            <TabsTrigger value="painel-geral" className="text-xs sm:text-sm">Painel Geral</TabsTrigger>
            <TabsTrigger value="painel-tecnico" className="text-xs sm:text-sm">Painel Técnico</TabsTrigger>
            <TabsTrigger value="graficos" className="text-xs sm:text-sm">Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="painel-geral">
            <MiscPainelGeral data={filteredData} dadosTecnicos={dadosTecnicos} tecnicoSupervisorMap={tecnicoSupervisorMap} />
          </TabsContent>
          <TabsContent value="painel-tecnico">
            <MiscPainelTecnico data={filteredData} tecnicos={tecnicos} />
          </TabsContent>
          <TabsContent value="graficos">
            <MiscGraficos data={filteredData} />
          </TabsContent>
        </Tabs>
      </main>

      <MiscImportDialog open={importOpen} onOpenChange={setImportOpen} onImportComplete={fetchData} cidade={selectedCity} />
    </div>
  );
};

export default ExcessoMiscelaneas;