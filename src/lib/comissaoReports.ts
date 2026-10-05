import type { ComissaoPeriodoDetalhe } from '@/types/database';

export type ComissaoRelatorioTecnico = {
  idInstalador: number;
  tecnico: string;
  login: string;
  contratos: number;
  os: number;
  servicos: number;
};

export type ComissaoRelatorioServico = {
  idComissionamento: number;
  produto: string;
  contratos: number;
  os: number;
  tecnicos: number;
};

export const buildComissaoReport = (details: ComissaoPeriodoDetalhe[]) => {
  const tecnicos = new Map<number, ComissaoRelatorioTecnico & { servicoIds: Set<number> }>();
  const servicos = new Map<number, ComissaoRelatorioServico & { tecnicoIds: Set<number> }>();

  details.forEach((detail) => {
    const tecnico = tecnicos.get(detail.id_instalador) ?? {
      idInstalador: detail.id_instalador,
      tecnico: detail.tecnico || detail.tecnico_api,
      login: detail.login || '-',
      contratos: 0,
      os: 0,
      servicos: 0,
      servicoIds: new Set<number>(),
    };
    tecnico.contratos += Number(detail.qtd_contrato) || 0;
    tecnico.os += Number(detail.qtd_os) || 0;
    tecnico.servicoIds.add(detail.id_comissionamento);
    tecnico.servicos = tecnico.servicoIds.size;
    tecnicos.set(detail.id_instalador, tecnico);

    const servico = servicos.get(detail.id_comissionamento) ?? {
      idComissionamento: detail.id_comissionamento,
      produto: detail.produto || detail.produto_api,
      contratos: 0,
      os: 0,
      tecnicos: 0,
      tecnicoIds: new Set<number>(),
    };
    servico.contratos += Number(detail.qtd_contrato) || 0;
    servico.os += Number(detail.qtd_os) || 0;
    servico.tecnicoIds.add(detail.id_instalador);
    servico.tecnicos = servico.tecnicoIds.size;
    servicos.set(detail.id_comissionamento, servico);
  });

  return {
    totals: {
      contratos: details.reduce((sum, detail) => sum + (Number(detail.qtd_contrato) || 0), 0),
      os: details.reduce((sum, detail) => sum + (Number(detail.qtd_os) || 0), 0),
      tecnicos: tecnicos.size,
      servicos: servicos.size,
    },
    tecnicos: [...tecnicos.values()]
      .map(({ servicoIds, ...tecnico }) => tecnico)
      .sort((a, b) => b.contratos - a.contratos || a.tecnico.localeCompare(b.tecnico, 'pt-BR')),
    servicos: [...servicos.values()]
      .map(({ tecnicoIds, ...servico }) => servico)
      .sort((a, b) => b.contratos - a.contratos || a.produto.localeCompare(b.produto, 'pt-BR')),
  };
};

export const buildComissaoWorkbookData = (
  report: ReturnType<typeof buildComissaoReport>,
  competencia: string,
  periodo: string,
  atualizadoEm: string,
) => ({
  resumo: [
    ['Relatório de comissão'],
    ['Competência', competencia],
    ['Período consultado', periodo],
    ['Atualizado em', atualizadoEm],
    [],
    ['Indicador', 'Quantidade'],
    ['Contratos', report.totals.contratos],
    ['Ordens de serviço', report.totals.os],
    ['Técnicos com produção', report.totals.tecnicos],
    ['Serviços executados', report.totals.servicos],
  ],
  tecnicos: [
    ['ID instalador', 'Técnico', 'Login', 'Contratos', 'Tipos de serviço', 'Ordens de serviço'],
    ...report.tecnicos.map((tecnico) => [
      tecnico.idInstalador,
      tecnico.tecnico,
      tecnico.login,
      tecnico.contratos,
      tecnico.servicos,
      tecnico.os,
    ]),
  ],
  servicos: [
    ['ID comissionamento', 'Serviço', 'Contratos', 'Técnicos', 'Ordens de serviço'],
    ...report.servicos.map((servico) => [
      servico.idComissionamento,
      servico.produto,
      servico.contratos,
      servico.tecnicos,
      servico.os,
    ]),
  ],
});
