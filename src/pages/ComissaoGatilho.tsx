import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BadgeDollarSign,
  CalendarDays,
  ClipboardList,
  FilterX,
  FileBarChart2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardHeader from '@/components/DashboardHeader';
import DashboardLoadingState from '@/components/DashboardLoadingState';
import KPICard from '@/components/KPICard';
import MultiSelectCombobox from '@/components/MultiSelectCombobox';
import ComissaoReportsDialog from '@/components/comissao/ComissaoReportsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { fetchComissao, type ComissaoApiResponse, type ComissaoDetalhadoItem } from '@/lib/comissaoApi';
import { isSingleMonthRange, loadLatestComissaoMonth, saveComissaoMonth } from '@/lib/comissaoHistory';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { ComissaoServico, ComissaoTecnico, Cidade } from '@/types/database';

const COMISSAO_CITY: Cidade = 'NATAL/PARNAMIRIM';

type DetalhadoEnriquecido = ComissaoDetalhadoItem & {
  tecnicoMapeado?: ComissaoTecnico;
  servicoMapeado?: ComissaoServico;
  tecnicoLabel: string;
  servicoLabel: string;
};

type ProducaoTecnico = {
  idInstalador: number;
  tecnico: string;
  login: string;
  nomeApi: string;
  contratos: number;
  os: number;
  valor: number;
  servicos: number;
  mapeado: boolean;
};

type ServicoAgregado = {
  idComissionamento: number;
  produto: string;
  contratos: number;
  os: number;
  valor: number;
  tecnicos: number;
  mapeado: boolean;
};

const todayInput = () => new Date().toISOString().slice(0, 10);

const monthStartInput = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
};

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);

const formatDateBR = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const tecnicoOptionLabel = (tecnico: ComissaoTecnico) =>
  `${tecnico.tecnico} (${tecnico.login.toUpperCase()})`;

const servicoOptionLabel = (servico: ComissaoServico) =>
  `${servico.id_comissionamento} - ${servico.produto}`;

const emptyApi: ComissaoApiResponse = {
  success: true,
  data_ini: '',
  data_fim: '',
  resumo: [],
  detalhado: [],
};

const ComissaoGatilho = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { selectedCity } = useCity();
  const isAdmin = profile?.role === 'admin';
  const isCommissionCity = selectedCity === COMISSAO_CITY;

  const [dataInicial, setDataInicial] = useState(monthStartInput);
  const [dataFinal, setDataFinal] = useState(todayInput);
  const [selectedTecnicos, setSelectedTecnicos] = useState<string[]>([]);
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);
  const [tecnicosMapeados, setTecnicosMapeados] = useState<ComissaoTecnico[]>([]);
  const [servicosMapeados, setServicosMapeados] = useState<ComissaoServico[]>([]);
  const [apiData, setApiData] = useState<ComissaoApiResponse | null>(null);
  const [mappingError, setMappingError] = useState('');
  const [apiError, setApiError] = useState('');
  const [persistenceError, setPersistenceError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  useEffect(() => {
    if (!selectedCity) {
      navigate('/selecionar-cidade', { replace: true });
    }
  }, [navigate, selectedCity]);

  useEffect(() => {
    let active = true;

    const loadMappings = async () => {
      if (!isAdmin || !isCommissionCity) {
        setTecnicosMapeados([]);
        setServicosMapeados([]);
        setMappingError('');
        return;
      }

      setLoadingMappings(true);
      setMappingError('');

      try {
        const [tecnicosResult, servicosResult] = await Promise.all([
          supabase
            .from('comissao_tecnicos')
            .select('*')
            .eq('cidade', COMISSAO_CITY)
            .eq('ativo', true)
            .order('tecnico', { ascending: true }),
          supabase
            .from('comissao_servicos')
            .select('*')
            .eq('ativo', true)
            .order('produto', { ascending: true }),
        ]);

        if (!active) return;

        if (tecnicosResult.error) throw new Error(tecnicosResult.error.message);
        if (servicosResult.error) throw new Error(servicosResult.error.message);

        setTecnicosMapeados((tecnicosResult.data as ComissaoTecnico[]) || []);
        setServicosMapeados((servicosResult.data as ComissaoServico[]) || []);
      } catch (error) {
        if (!active) return;
        setTecnicosMapeados([]);
        setServicosMapeados([]);
        setMappingError(error instanceof Error ? error.message : 'Erro ao carregar mapeamentos de comissão.');
      } finally {
        if (active) setLoadingMappings(false);
      }
    };

    void loadMappings();

    return () => {
      active = false;
    };
  }, [isAdmin, isCommissionCity]);

  useEffect(() => {
    if (!isAdmin || !isCommissionCity) return;

    let active = true;
    const loadSavedData = async () => {
      setLoadingSaved(true);
      setHistoryError('');

      try {
        const saved = await loadLatestComissaoMonth(COMISSAO_CITY);
        if (!active || !saved) return;

        setDataInicial(saved.periodo.data_inicio);
        setDataFinal(saved.periodo.data_fim);
        setApiData(saved.response);
      } catch (error) {
        if (!active) return;
        setHistoryError(error instanceof Error ? error.message : 'Erro ao carregar o histórico de comissão.');
      } finally {
        if (active) setLoadingSaved(false);
      }
    };

    void loadSavedData();
    return () => {
      active = false;
    };
  }, [isAdmin, isCommissionCity]);

  const tecnicoByInstallerId = useMemo(() => {
    const map = new Map<number, ComissaoTecnico>();
    tecnicosMapeados.forEach((tecnico) => map.set(tecnico.id_instalador, tecnico));
    return map;
  }, [tecnicosMapeados]);

  const servicoByComissionamentoId = useMemo(() => {
    const map = new Map<number, ComissaoServico>();
    servicosMapeados.forEach((servico) => map.set(servico.id_comissionamento, servico));
    return map;
  }, [servicosMapeados]);

  const response = apiData ?? emptyApi;

  const tecnicoOptions = useMemo(
    () => {
      const options = new Set(tecnicosMapeados.map(tecnicoOptionLabel));
      response.resumo.forEach((item) => {
        const mapped = tecnicoByInstallerId.get(item.IdInstalador);
        options.add(mapped ? tecnicoOptionLabel(mapped) : item.NomeAbreviado || `Instalador ${item.IdInstalador}`);
      });
      return [...options].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [response.resumo, tecnicoByInstallerId, tecnicosMapeados],
  );

  const servicoOptions = useMemo(
    () => {
      const options = new Set(servicosMapeados.map(servicoOptionLabel));
      response.detalhado.forEach((item) => {
        const mapped = servicoByComissionamentoId.get(item.IdComissionamento);
        options.add(mapped ? servicoOptionLabel(mapped) : `${item.IdComissionamento} - ${item.Produto}`);
      });
      return [...options].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [response.detalhado, servicoByComissionamentoId, servicosMapeados],
  );

  const handleBuscar = async () => {
    if (!isCommissionCity) {
      toast.error('A API de comissão está disponível apenas para NATAL/PARNAMIRIM.');
      return;
    }

    if (!dataInicial || !dataFinal) {
      toast.error('Informe a data inicial e a data final.');
      return;
    }

    if (dataInicial > dataFinal) {
      toast.error('A data inicial não pode ser maior que a data final.');
      return;
    }

    if (!isSingleMonthRange(dataInicial, dataFinal)) {
      toast.error('A consulta deve ficar dentro do mesmo mês para ser salva na competência correta.');
      return;
    }

    setLoadingApi(true);
    setApiError('');
    setPersistenceError('');

    try {
      const response = await fetchComissao(dataInicial, dataFinal);
      setApiData(response);

      try {
        await saveComissaoMonth(COMISSAO_CITY, dataInicial, dataFinal, response);
        toast.success(`Comissão de ${formatDateBR(dataInicial)} a ${formatDateBR(dataFinal)} carregada e salva.`);
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : 'Erro ao salvar o histórico mensal.';
        setPersistenceError(message);
        toast.warning('Dados carregados, mas o histórico mensal não pôde ser salvo.');
      }
    } catch (error) {
      setApiData(null);
      setApiError(error instanceof Error ? error.message : 'Erro ao buscar dados da API de comissão.');
    } finally {
      setLoadingApi(false);
    }
  };

  const clearFilters = () => {
    setSelectedTecnicos([]);
    setSelectedServicos([]);
  };

  const detalhesEnriquecidos = useMemo<DetalhadoEnriquecido[]>(() => {
    return response.detalhado.map((item) => {
      const tecnicoMapeado = tecnicoByInstallerId.get(item.IdInstalador);
      const servicoMapeado = servicoByComissionamentoId.get(item.IdComissionamento);

      return {
        ...item,
        tecnicoMapeado,
        servicoMapeado,
        tecnicoLabel: tecnicoMapeado ? tecnicoOptionLabel(tecnicoMapeado) : item.NomeAbreviado || `Instalador ${item.IdInstalador}`,
        servicoLabel: servicoMapeado ? servicoOptionLabel(servicoMapeado) : `${item.IdComissionamento} - ${item.Produto}`,
      };
    });
  }, [response.detalhado, servicoByComissionamentoId, tecnicoByInstallerId]);

  const detalhesFiltrados = useMemo(() => {
    return detalhesEnriquecidos.filter((item) => {
      const matchTecnico = selectedTecnicos.length === 0 || selectedTecnicos.includes(item.tecnicoLabel);
      const matchServico = selectedServicos.length === 0 || selectedServicos.includes(item.servicoLabel);
      return matchTecnico && matchServico;
    });
  }, [detalhesEnriquecidos, selectedServicos, selectedTecnicos]);

  const producaoTecnicos = useMemo<ProducaoTecnico[]>(() => {
    const map = new Map<number, ProducaoTecnico & { servicoIds: Set<number> }>();

    detalhesFiltrados.forEach((item) => {
      const current = map.get(item.IdInstalador) ?? {
        idInstalador: item.IdInstalador,
        tecnico: item.tecnicoMapeado?.tecnico ?? item.NomeAbreviado,
        login: item.tecnicoMapeado?.login ?? '-',
        nomeApi: item.NomeAbreviado,
        contratos: 0,
        os: 0,
        valor: 0,
        servicos: 0,
        mapeado: Boolean(item.tecnicoMapeado),
        servicoIds: new Set<number>(),
      };

      current.contratos += item.QtdContrato;
      current.os += item.QtdOs;
      current.valor += item.Valor;
      current.servicoIds.add(item.IdComissionamento);
      current.servicos = current.servicoIds.size;
      map.set(item.IdInstalador, current);
    });

    return [...map.values()]
      .map(({ servicoIds, ...item }) => item)
      .sort((a, b) => b.contratos - a.contratos || b.os - a.os);
  }, [detalhesFiltrados]);

  const detalhesParaCompararServicos = useMemo(() => {
    return detalhesEnriquecidos.filter((item) => (
      selectedTecnicos.length === 0 || selectedTecnicos.includes(item.tecnicoLabel)
    ));
  }, [detalhesEnriquecidos, selectedTecnicos]);

  const servicosAgregados = useMemo<ServicoAgregado[]>(() => {
    const map = new Map<number, ServicoAgregado & { tecnicoSet: Set<number> }>();

    detalhesParaCompararServicos.forEach((item) => {
      const servicoMapeado = item.servicoMapeado;
      const current = map.get(item.IdComissionamento) ?? {
        idComissionamento: item.IdComissionamento,
        produto: servicoMapeado?.produto ?? item.Produto,
        contratos: 0,
        os: 0,
        valor: 0,
        tecnicos: 0,
        mapeado: Boolean(servicoMapeado),
        tecnicoSet: new Set<number>(),
      };

      current.contratos += item.QtdContrato;
      current.os += item.QtdOs;
      current.valor += item.Valor;
      current.tecnicoSet.add(item.IdInstalador);
      current.tecnicos = current.tecnicoSet.size;
      map.set(item.IdComissionamento, current);
    });

    return [...map.values()]
      .map(({ tecnicoSet, ...item }) => item)
      .sort((a, b) => b.contratos - a.contratos);
  }, [detalhesParaCompararServicos]);

  const totals = useMemo(() => {
    const uniqueTecnicos = new Set(detalhesFiltrados.map((item) => item.IdInstalador));
    const uniqueServicos = new Set(detalhesFiltrados.map((item) => item.IdComissionamento));

    return {
      tecnicos: uniqueTecnicos.size,
      servicos: uniqueServicos.size,
      contratos: detalhesFiltrados.reduce((sum, item) => sum + item.QtdContrato, 0),
      os: detalhesFiltrados.reduce((sum, item) => sum + item.QtdOs, 0),
      valorFiltrado: detalhesFiltrados.reduce((sum, item) => sum + item.Valor, 0),
      mediaPorTecnico: uniqueTecnicos.size > 0
        ? detalhesFiltrados.reduce((sum, item) => sum + item.QtdContrato, 0) / uniqueTecnicos.size
        : 0,
    };
  }, [detalhesFiltrados]);

  const missingTechnicians = useMemo(() => {
    const ids = new Set<number>();
    response.resumo.forEach((item) => {
      if (!tecnicoByInstallerId.has(item.IdInstalador)) ids.add(item.IdInstalador);
    });
    return ids.size;
  }, [response.resumo, tecnicoByInstallerId]);

  const missingServices = useMemo(() => {
    const ids = new Set<number>();
    response.detalhado.forEach((item) => {
      if (!servicoByComissionamentoId.has(item.IdComissionamento)) ids.add(item.IdComissionamento);
    });
    return ids.size;
  }, [response.detalhado, servicoByComissionamentoId]);

  const maxContratosServico = Math.max(...servicosAgregados.map((item) => item.contratos), 1);

  const handleFocusServico = (servico: ServicoAgregado) => {
    const mapped = servicoByComissionamentoId.get(servico.idComissionamento);
    const label = mapped
      ? servicoOptionLabel(mapped)
      : `${servico.idComissionamento} - ${servico.produto}`;
    setSelectedServicos([label]);
    setSelectedTecnicos([]);
    window.requestAnimationFrame(() => {
      document.getElementById('producao-por-tecnico')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const hasData = Boolean(apiData);
  const hasActiveFilters = selectedTecnicos.length > 0 || selectedServicos.length > 0;

  if (!selectedCity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Redirecionando...</span>
      </div>
    );
  }

  if (!isAdmin) {
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
        {!isCommissionCity && (
          <Alert>
            <MapPin className="size-4" />
            <AlertDescription>
              Comissão disponível apenas para {COMISSAO_CITY}. Troque a cidade no topo para usar esta área.
            </AlertDescription>
          </Alert>
        )}

        {mappingError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Erro nos mapeamentos: {mappingError}. Confirme se a migration de comissão já foi aplicada no Supabase.
            </AlertDescription>
          </Alert>
        )}

        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {persistenceError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>Dados exibidos, mas não salvos: {persistenceError}</AlertDescription>
          </Alert>
        )}

        {historyError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Não foi possível restaurar os dados salvos: {historyError}. Você ainda pode atualizar usando a busca.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BadgeDollarSign className="size-4 text-primary" />
                  Contratos por serviço
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {COMISSAO_CITY}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{tecnicosMapeados.length} técnicos mapeados</Badge>
                <Badge variant="secondary">{servicosMapeados.length} serviços mapeados</Badge>
                {hasData && (
                  <Badge variant="outline">
                    {formatDateBR(response.data_ini)} até {formatDateBR(response.data_fim)}
                  </Badge>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setReportsOpen(true)}>
                  <FileBarChart2 className="size-4" />
                  Relatórios
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-2 sm:p-5 sm:pt-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(280px,1.65fr)_minmax(220px,1.35fr)_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="comissao-data-inicial">Data inicial</Label>
              <Input
                id="comissao-data-inicial"
                type="date"
                value={dataInicial}
                onChange={(event) => setDataInicial(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comissao-data-final">Data final</Label>
              <Input
                id="comissao-data-final"
                type="date"
                value={dataFinal}
                onChange={(event) => setDataFinal(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comissao-servicos">Serviço</Label>
              <MultiSelectCombobox
                id="comissao-servicos"
                options={servicoOptions}
                selected={selectedServicos}
                onChange={setSelectedServicos}
                placeholder={loadingMappings ? 'Carregando...' : 'Todos'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comissao-tecnicos">Técnico</Label>
              <MultiSelectCombobox
                id="comissao-tecnicos"
                options={tecnicoOptions}
                selected={selectedTecnicos}
                onChange={setSelectedTecnicos}
                placeholder={loadingMappings ? 'Carregando...' : 'Todos'}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={clearFilters}
                variant="outline"
                disabled={!hasActiveFilters || loadingApi || loadingSaved}
                className="min-w-10"
                title="Limpar filtros"
              >
                <FilterX className="size-4" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
              <Button
                type="button"
                onClick={handleBuscar}
                disabled={!isCommissionCity || loadingApi || loadingSaved}
                className="min-w-32"
              >
                {loadingApi ? <RefreshCw className="size-4 animate-spin" /> : <Search className="size-4" />}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasData && (missingTechnicians > 0 || missingServices > 0) && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Há {missingTechnicians} técnico(s) e {missingServices} serviço(s) da API sem correlação no banco. Eles continuam disponíveis pelos nomes e IDs recebidos da API.
            </AlertDescription>
          </Alert>
        )}

        {loadingApi || loadingSaved ? (
          <DashboardLoadingState
            cards={5}
            title={loadingSaved ? 'Carregando comissão salva' : 'Buscando comissão'}
            description={loadingSaved
              ? 'Restaurando a competência mais recente diretamente do Supabase.'
              : 'Consultando a API do Imperium e cruzando com os mapeamentos do Supabase.'}
          />
        ) : !hasData ? (
          <Card>
            <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
              <CalendarDays className="size-10 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Selecione o período</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Os dados salvos aparecem automaticamente. Use a busca para atualizar a competência pela API.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 dashboard-grid-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KPICard title="Contratos" value={formatNumber(totals.contratos)} subtitle="QtdContrato filtrado" icon={ClipboardList} color="success" />
              <KPICard title="Serviços" value={String(totals.servicos)} subtitle="tipos analisados" icon={PackageCheck} color="primary" />
              <KPICard title="Técnicos" value={String(totals.tecnicos)} subtitle="com produção no filtro" icon={Users} color="primary" />
              <KPICard title="Média por técnico" value={formatNumber(totals.mediaPorTecnico, 1)} subtitle="contratos por técnico" icon={Users} color="success" />
              <KPICard title="OS" value={formatNumber(totals.os)} subtitle="QtdOs filtrado" icon={PackageCheck} color="warning" />
              <KPICard title="Pontos" value={formatNumber(totals.valorFiltrado, 2)} subtitle="valor dos serviços filtrados" icon={BadgeDollarSign} color="destructive" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
              <Card id="producao-por-tecnico" className="scroll-mt-20">
                <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="size-4 text-primary" />
                        Produção por técnico
                      </CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {selectedServicos.length > 0
                          ? selectedServicos.join(', ')
                          : 'Todos os serviços. Selecione um serviço para detalhar.'}
                      </p>
                    </div>
                    <Badge variant={selectedServicos.length > 0 ? 'default' : 'secondary'}>
                      {producaoTecnicos.length} técnicos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Técnico / ID</TableHead>
                        <TableHead>Login</TableHead>
                        <TableHead className="text-right">Serviços</TableHead>
                        <TableHead className="text-right">Contratos</TableHead>
                        <TableHead className="text-right">OS</TableHead>
                        <TableHead className="text-right">Pontos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {producaoTecnicos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            Sem dados para os filtros atuais.
                          </TableCell>
                        </TableRow>
                      ) : (
                        producaoTecnicos.map((row) => (
                          <TableRow key={row.idInstalador}>
                            <TableCell>
                              <div className="min-w-[220px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-foreground">{row.tecnico}</span>
                                  <Badge variant={row.mapeado ? 'secondary' : 'outline'}>ID {row.idInstalador}</Badge>
                                </div>
                                {!row.mapeado && <p className="mt-1 text-xs text-muted-foreground">API: {row.nomeApi}</p>}
                              </div>
                            </TableCell>
                            <TableCell>{row.login}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.servicos)}</TableCell>
                            <TableCell className="text-right text-base font-bold">{formatNumber(row.contratos)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.os)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.valor, 2)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <PackageCheck className="size-4 text-primary" />
                        Contratos por serviço
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Clique em um serviço para detalhar os técnicos.</p>
                    </div>
                    <Badge variant="secondary">Top 10</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  {servicosAgregados.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Sem dados para os filtros atuais.</div>
                  ) : (
                    servicosAgregados.slice(0, 10).map((servico) => {
                      const width = Math.max(8, (servico.contratos / maxContratosServico) * 100);
                      const mapped = servicoByComissionamentoId.get(servico.idComissionamento);
                      const label = mapped
                        ? servicoOptionLabel(mapped)
                        : `${servico.idComissionamento} - ${servico.produto}`;
                      const selected = selectedServicos.includes(label);
                      return (
                        <button
                          key={servico.idComissionamento}
                          type="button"
                          onClick={() => handleFocusServico(servico)}
                          aria-pressed={selected}
                          className={cn(
                            'block w-full cursor-pointer space-y-2 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected && 'bg-primary/5 ring-1 ring-primary/30',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{servico.produto}</p>
                              <p className="text-xs text-muted-foreground">
                                ID {servico.idComissionamento} · {servico.tecnicos} técnico(s)
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-foreground">{formatNumber(servico.contratos)}</p>
                              <p className="text-xs text-muted-foreground">{formatNumber(servico.valor, 2)} pts</p>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="size-4 text-primary" />
                      Todos os serviços
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compare contratos, técnicos e a média de produção antes de abrir o detalhamento.
                    </p>
                  </div>
                  <Badge variant="secondary">{servicosAgregados.length} serviços</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Contratos</TableHead>
                      <TableHead className="text-right">Técnicos</TableHead>
                      <TableHead className="text-right">Média/técnico</TableHead>
                      <TableHead className="text-right">OS</TableHead>
                      <TableHead className="text-right">Pontos</TableHead>
                      <TableHead className="text-right">Detalhar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicosAgregados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          Sem dados para os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      servicosAgregados.map((servico) => {
                        const mapped = servicoByComissionamentoId.get(servico.idComissionamento);
                        const label = mapped
                          ? servicoOptionLabel(mapped)
                          : `${servico.idComissionamento} - ${servico.produto}`;
                        const selected = selectedServicos.includes(label);

                        return (
                          <TableRow key={servico.idComissionamento} data-state={selected ? 'selected' : undefined}>
                            <TableCell>
                              <div className="min-w-[280px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-foreground">{servico.produto}</span>
                                  <Badge variant={servico.mapeado ? 'secondary' : 'outline'}>
                                    {servico.mapeado ? `ID ${servico.idComissionamento}` : `API · ID ${servico.idComissionamento}`}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-base font-bold">{formatNumber(servico.contratos)}</TableCell>
                            <TableCell className="text-right">{formatNumber(servico.tecnicos)}</TableCell>
                            <TableCell className="text-right">
                              {formatNumber(servico.tecnicos > 0 ? servico.contratos / servico.tecnicos : 0, 1)}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(servico.os)}</TableCell>
                            <TableCell className="text-right">{formatNumber(servico.valor, 2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant={selected ? 'secondary' : 'outline'}
                                onClick={() => handleFocusServico(servico)}
                                aria-pressed={selected}
                              >
                                <Users className="size-4" />
                                {selected ? 'Selecionado' : 'Ver técnicos'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <ComissaoReportsDialog
        open={reportsOpen}
        onOpenChange={setReportsOpen}
        cidade={COMISSAO_CITY}
      />
    </div>
  );
};

export default ComissaoGatilho;
