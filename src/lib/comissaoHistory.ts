import type { ComissaoApiResponse } from '@/lib/comissaoApi';
import { supabase } from '@/lib/supabase';
import type {
  ComissaoPeriodo,
  ComissaoPeriodoDetalhe,
  ComissaoPeriodoTecnico,
  Json,
} from '@/types/database';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isSingleMonthRange = (dataInicial: string, dataFinal: string) =>
  ISO_DATE_PATTERN.test(dataInicial)
  && ISO_DATE_PATTERN.test(dataFinal)
  && dataInicial <= dataFinal
  && dataInicial.slice(0, 7) === dataFinal.slice(0, 7);

const numberValue = (value: number) => Number(value) || 0;

export const restoreComissaoResponse = (
  periodo: ComissaoPeriodo,
  tecnicos: ComissaoPeriodoTecnico[],
  detalhes: ComissaoPeriodoDetalhe[],
): ComissaoApiResponse => ({
  success: true,
  data_ini: periodo.data_inicio,
  data_fim: periodo.data_fim,
  resumo: tecnicos.map((tecnico) => ({
    IdInstalador: tecnico.id_instalador,
    NomeAbreviado: tecnico.tecnico_api,
    QtdProdutos: numberValue(tecnico.qtd_produtos),
    QtdContrato: numberValue(tecnico.qtd_contrato),
    QtdOs: numberValue(tecnico.qtd_os),
    TotalValor: numberValue(tecnico.total_valor),
    TotalValorInstalador: numberValue(tecnico.total_valor_instalador),
    TotalValorAuxiliar: numberValue(tecnico.total_valor_auxiliar),
  })),
  detalhado: detalhes.map((detalhe) => ({
    IdInstalador: detalhe.id_instalador,
    NomeAbreviado: detalhe.tecnico_api,
    IdComissionamento: detalhe.id_comissionamento,
    Produto: detalhe.produto_api,
    QtdContrato: numberValue(detalhe.qtd_contrato),
    QtdOs: numberValue(detalhe.qtd_os),
    Valor: numberValue(detalhe.valor),
    ValorInstalador: numberValue(detalhe.valor_instalador),
    ValorAuxiliar: numberValue(detalhe.valor_auxiliar),
  })),
});

export const loadLatestComissaoMonth = async (cidade: string) => {
  const { data: periodoData, error: periodoError } = await supabase
    .from('comissao_periodos')
    .select('*')
    .eq('cidade', cidade)
    .order('competencia', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (periodoError) throw new Error(periodoError.message);
  if (!periodoData) return null;

  const periodo = periodoData as ComissaoPeriodo;
  const [tecnicosResult, detalhesResult] = await Promise.all([
    supabase
      .from('comissao_periodo_tecnicos')
      .select('*')
      .eq('periodo_id', periodo.id)
      .order('id_instalador', { ascending: true }),
    supabase
      .from('comissao_periodo_detalhes')
      .select('*')
      .eq('periodo_id', periodo.id)
      .order('id_instalador', { ascending: true })
      .order('id_comissionamento', { ascending: true }),
  ]);

  if (tecnicosResult.error) throw new Error(tecnicosResult.error.message);
  if (detalhesResult.error) throw new Error(detalhesResult.error.message);

  return {
    periodo,
    response: restoreComissaoResponse(
      periodo,
      (tecnicosResult.data as ComissaoPeriodoTecnico[]) || [],
      (detalhesResult.data as ComissaoPeriodoDetalhe[]) || [],
    ),
  };
};

export const saveComissaoMonth = async (
  cidade: string,
  dataInicial: string,
  dataFinal: string,
  response: ComissaoApiResponse,
) => {
  const { data, error } = await supabase.rpc('salvar_comissao_mensal', {
    p_cidade: cidade,
    p_data_inicio: dataInicial,
    p_data_fim: dataFinal,
    p_resumo: response.resumo as unknown as Json,
    p_detalhado: response.detalhado as unknown as Json,
  });

  if (error) {
    const migrationHint = error.code === 'PGRST202' || error.message.includes('salvar_comissao_mensal')
      ? ' Aplique a migration do histórico mensal no Supabase.'
      : '';
    throw new Error(`${error.message}.${migrationHint}`.replace('..', '.'));
  }

  return data;
};
