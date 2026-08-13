import { supabase } from '@/lib/supabase';
import type { KmTecnica } from '@/types/database';

const KM_PAGE_SIZE = 1000;

export const KM_SUMMARY_COLUMNS = [
  'id',
  'login_tecnico',
  'recurso',
  'data',
  'trecho',
  'endereco_destino',
  'distancia_km',
  'frente',
  'cidade',
  'created_at',
].join(',');

const KM_MAP_COLUMNS = [
  'id',
  'login_tecnico',
  'recurso',
  'data',
  'trecho',
  'endereco_destino',
  'distancia_km',
  'frente',
  'cidade',
  'coord_origem_x',
  'coord_origem_y',
  'coord_destino_x',
  'coord_destino_y',
  'created_at',
].join(',');

interface KmQueryOptions {
  cidade: string;
  dataInicial?: string;
  dataFinal?: string;
  loginTecnico?: string;
  logins?: string[];
  frentes?: string[];
  signal?: AbortSignal;
}

interface KmCursor {
  data: string;
  id: string;
}

const fetchKmPages = async (
  columns: string,
  options: KmQueryOptions,
): Promise<KmTecnica[]> => {
  const rows: KmTecnica[] = [];
  let cursor: KmCursor | null = null;

  while (true) {
    let query = supabase
      .from('km_tecnica')
      .select(columns)
      .eq('cidade', options.cidade)
      .order('data', { ascending: true })
      .order('id', { ascending: true })
      .limit(KM_PAGE_SIZE);

    if (options.dataInicial) query = query.gte('data', options.dataInicial);
    if (options.dataFinal) query = query.lte('data', options.dataFinal);
    if (options.loginTecnico) query = query.eq('login_tecnico', options.loginTecnico);
    if (options.logins?.length) query = query.in('login_tecnico', options.logins);
    if (options.frentes?.length) query = query.in('frente', options.frentes);
    if (cursor) {
      query = query.or(`data.gt.${cursor.data},and(data.eq.${cursor.data},id.gt.${cursor.id})`);
    }
    if (options.signal) query = query.abortSignal(options.signal);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar km_tecnica: ${error.message}`);
    }

    const fetched = (data ?? []) as unknown as KmTecnica[];
    rows.push(...fetched);

    if (fetched.length < KM_PAGE_SIZE) break;

    const lastRow = fetched[fetched.length - 1];
    cursor = { data: lastRow.data, id: lastRow.id };
  }

  return rows;
};

export const fetchKmSummaryRows = async (options: KmQueryOptions): Promise<KmTecnica[]> => {
  const rows = await fetchKmPages(KM_SUMMARY_COLUMNS, options);

  return rows.map((row) => ({
    ...row,
    coord_origem_x: null,
    coord_origem_y: null,
    coord_destino_x: null,
    coord_destino_y: null,
  }));
};

export const fetchKmMapRows = (options: KmQueryOptions) => fetchKmPages(KM_MAP_COLUMNS, options);

export const shouldRetryKmQuery = (failureCount: number, error: Error) => {
  if (failureCount >= 2) return false;

  return /timeout|timed out|network|fetch|408|429|500|502|503|504/i.test(error.message);
};
