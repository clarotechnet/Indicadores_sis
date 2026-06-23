export type ComissaoResumoItem = {
  IdInstalador: number;
  NomeAbreviado: string;
  QtdProdutos: number;
  QtdContrato: number;
  QtdOs: number;
  TotalValor: number;
  TotalValorInstalador: number;
  TotalValorAuxiliar: number;
};

export type ComissaoDetalhadoItem = {
  IdInstalador: number;
  NomeAbreviado: string;
  IdComissionamento: number;
  Produto: string;
  QtdContrato: number;
  QtdOs: number;
  Valor: number;
  ValorInstalador: number;
  ValorAuxiliar: number;
};

export type ComissaoApiResponse = {
  success: boolean;
  data_ini: string;
  data_fim: string;
  resumo: ComissaoResumoItem[];
  detalhado: ComissaoDetalhadoItem[];
};

const DEFAULT_API_URL = 'https://api-comissao.onrender.com';

const baseUrl = () => {
  const configured = import.meta.env.VITE_API_COMISSAO_URL || DEFAULT_API_URL;
  return String(configured).replace(/\/+$/, '');
};

const getApiErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    const detail = payload?.detail;

    if (typeof detail === 'string') return detail;
    if (detail?.mensagem) return String(detail.mensagem);
    if (payload?.message) return String(payload.message);
  } catch {
    // Fall back to the response status below.
  }

  return `Erro ${response.status} ao buscar comissão.`;
};

export const fetchComissao = async (
  dataInicial: string,
  dataFinal: string,
  signal?: AbortSignal,
): Promise<ComissaoApiResponse> => {
  const params = new URLSearchParams({
    data_ini: dataInicial,
    data_fim: dataFinal,
  });

  const response = await fetch(`${baseUrl()}/comissao?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  const payload = (await response.json()) as ComissaoApiResponse;

  if (!payload.success) {
    throw new Error('A API de comissão respondeu sem sucesso.');
  }

  return payload;
};
