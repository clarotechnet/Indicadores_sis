import { supabase } from '@/lib/supabase';
import type { DadoTecnico, HorarioPrimeiroCliente, IndicadorTecnico } from '@/types/database';

export const DASHBOARD_PAGE_SIZE = 1000;
export const DASHBOARD_PAGE_CONCURRENCY = 4;

const INDICATOR_COLUMNS = [
  'id',
  'data_referencia',
  'login',
  'tecnico',
  'supervisor',
  'cidade',
  'nr35',
  'tnps',
  'inspecao_e',
  'revisita',
  'os_dig',
  'geo',
  'ura',
  'tec1',
  'bds',
  'created_at',
  'updated_at',
].join(',');

const SCHEDULE_COLUMNS = [
  'id',
  'data_referencia',
  'login',
  'tecnico',
  'supervisor',
  'cidade',
  'horario_primeiro_cliente',
  'classificacao_horario',
  'created_at',
  'updated_at',
].join(',');

interface DashboardQueryOptions {
  cidade: string;
  loginTecnico?: string;
  dataInicial?: string;
  dataFinal?: string;
  signal?: AbortSignal;
}

type DashboardRow = Pick<IndicadorTecnico, 'login' | 'tecnico' | 'supervisor' | 'cidade'>;

export const fetchDashboardPages = async <T,>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> => {
  const rows: T[] = [];
  const firstPage = await fetchPage(0, DASHBOARD_PAGE_SIZE - 1);
  rows.push(...firstPage);

  if (firstPage.length < DASHBOARD_PAGE_SIZE) return rows;

  let batchStart = DASHBOARD_PAGE_SIZE;

  while (true) {
    const offsets = Array.from(
      { length: DASHBOARD_PAGE_CONCURRENCY },
      (_, index) => batchStart + index * DASHBOARD_PAGE_SIZE,
    );
    const pages = await Promise.all(
      offsets.map((from) => fetchPage(from, from + DASHBOARD_PAGE_SIZE - 1)),
    );

    for (const page of pages) {
      rows.push(...page);
      if (page.length < DASHBOARD_PAGE_SIZE) return rows;
    }

    batchStart += DASHBOARD_PAGE_SIZE * DASHBOARD_PAGE_CONCURRENCY;
  }
};

const applyCommonFilters = <T extends {
  eq: (column: string, value: string) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  abortSignal: (signal: AbortSignal) => T;
}>(query: T, options: DashboardQueryOptions): T => {
  let filteredQuery = query;

  if (options.loginTecnico) filteredQuery = filteredQuery.eq('login', options.loginTecnico);
  if (options.dataInicial) filteredQuery = filteredQuery.gte('data_referencia', options.dataInicial);
  if (options.dataFinal) filteredQuery = filteredQuery.lte('data_referencia', options.dataFinal);
  if (options.signal) filteredQuery = filteredQuery.abortSignal(options.signal);

  return filteredQuery;
};

export const fetchIndicatorRows = (options: DashboardQueryOptions): Promise<IndicadorTecnico[]> =>
  fetchDashboardPages<IndicadorTecnico>(async (from, to) => {
    let query = supabase
      .from('indicadores_tecnicos')
      .select(INDICATOR_COLUMNS)
      .eq('cidade', options.cidade)
      .order('data_referencia', { ascending: true })
      .order('login', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    query = applyCommonFilters(query, options);
    const { data, error } = await query;

    if (error) throw new Error(`Erro ao buscar indicadores_tecnicos: ${error.message}`);
    return (data ?? []) as unknown as IndicadorTecnico[];
  });

export const fetchScheduleRows = (options: DashboardQueryOptions): Promise<HorarioPrimeiroCliente[]> =>
  fetchDashboardPages<HorarioPrimeiroCliente>(async (from, to) => {
    let query = supabase
      .from('horario_primeiro_cliente')
      .select(SCHEDULE_COLUMNS)
      .eq('cidade', options.cidade)
      .order('data_referencia', { ascending: true })
      .order('login', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    query = applyCommonFilters(query, options);
    const { data, error } = await query;

    if (error) throw new Error(`Erro ao buscar horario_primeiro_cliente: ${error.message}`);
    return (data ?? []) as unknown as HorarioPrimeiroCliente[];
  });

export const fetchActiveDashboardTechnicians = async (
  options: Pick<DashboardQueryOptions, 'cidade' | 'loginTecnico' | 'signal'>,
): Promise<DadoTecnico[]> => {
  let query = supabase
    .from('dados_tecnicos')
    .select('login,nome,cidade,supervisor,ativo')
    .eq('cidade', options.cidade)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (options.loginTecnico) query = query.eq('login', options.loginTecnico);
  if (options.signal) query = query.abortSignal(options.signal);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar tecnicos ativos: ${error.message}`);

  return (data as DadoTecnico[] | null) ?? [];
};

export const applyActiveTechnicianMetadata = <T extends DashboardRow>(
  rows: T[],
  technicians: DadoTecnico[],
): T[] => {
  const technicianByLogin = new Map(
    technicians.map((technician) => [technician.login.trim().toUpperCase(), technician]),
  );

  return rows.flatMap((row) => {
    const technician = technicianByLogin.get(row.login.trim().toUpperCase());
    if (!technician) return [];

    return [{
      ...row,
      login: technician.login.trim().toUpperCase(),
      tecnico: technician.nome,
      supervisor: technician.supervisor,
      cidade: technician.cidade,
    }];
  });
};

export const shouldRetryDashboardQuery = (failureCount: number, error: Error) => {
  if (failureCount >= 2) return false;
  return /timeout|timed out|network|fetch|408|429|500|502|503|504/i.test(error.message);
};
