import { describe, expect, it } from 'vitest';

import { isSingleMonthRange, restoreComissaoResponse } from '@/lib/comissaoHistory';
import { buildComissaoReport, buildComissaoWorkbookData } from '@/lib/comissaoReports';
import type { ComissaoPeriodo, ComissaoPeriodoDetalhe, ComissaoPeriodoTecnico } from '@/types/database';

const detail = (overrides: Partial<ComissaoPeriodoDetalhe>): ComissaoPeriodoDetalhe => ({
  id: crypto.randomUUID(),
  periodo_id: 'periodo-1',
  id_instalador: 10,
  tecnico_api: 'TECNICO API',
  tecnico: 'Técnico A',
  login: 'Z100',
  id_comissionamento: 20,
  produto_api: 'PRODUTO API',
  produto: 'Instalação',
  qtd_contrato: 0,
  qtd_os: 0,
  valor: 0,
  valor_instalador: 0,
  valor_auxiliar: 0,
  ...overrides,
});

describe('buildComissaoReport', () => {
  it('aggregates contracts by technician and service with distinct counts', () => {
    const report = buildComissaoReport([
      detail({ qtd_contrato: 3, qtd_os: 4 }),
      detail({ id_comissionamento: 21, produto: 'Reparo', qtd_contrato: 2, qtd_os: 2 }),
      detail({ id_instalador: 11, tecnico: 'Técnico B', login: 'Z200', qtd_contrato: 5, qtd_os: 6 }),
    ]);

    expect(report.totals).toEqual({ contratos: 10, os: 12, tecnicos: 2, servicos: 2 });
    expect(report.tecnicos[0]).toMatchObject({ idInstalador: 10, contratos: 5, servicos: 2 });
    expect(report.servicos[0]).toMatchObject({ idComissionamento: 20, contratos: 8, tecnicos: 2 });
  });

  it('creates separate workbook tables for the summary, technicians and services', () => {
    const report = buildComissaoReport([
      detail({ qtd_contrato: 3, qtd_os: 4 }),
      detail({ id_instalador: 11, tecnico: 'Técnico B', qtd_contrato: 2, qtd_os: 3 }),
    ]);
    const workbook = buildComissaoWorkbookData(report, 'Setembro de 2026', '01/09/2026 até 30/09/2026', '30/09/2026 12:00');

    expect(workbook.resumo).toContainEqual(['Contratos', 5]);
    expect(workbook.tecnicos).toHaveLength(3);
    expect(workbook.servicos).toHaveLength(2);
  });
});

describe('isSingleMonthRange', () => {
  it('accepts one monthly competence and rejects ranges crossing months', () => {
    expect(isSingleMonthRange('2026-09-01', '2026-09-30')).toBe(true);
    expect(isSingleMonthRange('2026-09-30', '2026-10-01')).toBe(false);
    expect(isSingleMonthRange('2026-09-10', '2026-09-01')).toBe(false);
  });
});

describe('restoreComissaoResponse', () => {
  it('rebuilds the API shape from the saved monthly tables', () => {
    const periodo: ComissaoPeriodo = {
      id: 'periodo-1',
      competencia: '2026-09-01',
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      cidade: 'NATAL/PARNAMIRIM',
      consultado_por: null,
      created_at: '2026-09-30T12:00:00Z',
      updated_at: '2026-09-30T12:00:00Z',
    };
    const tecnico: ComissaoPeriodoTecnico = {
      id: 'tecnico-1',
      periodo_id: periodo.id,
      id_instalador: 10,
      tecnico_api: 'TECNICO API',
      tecnico: 'Técnico A',
      login: 'Z100',
      qtd_produtos: 1,
      qtd_contrato: 3,
      qtd_os: 4,
      total_valor: 10,
      total_valor_instalador: 8,
      total_valor_auxiliar: 2,
    };

    const restored = restoreComissaoResponse(periodo, [tecnico], [detail({ qtd_contrato: 3 })]);

    expect(restored.data_ini).toBe('2026-09-01');
    expect(restored.resumo[0]).toMatchObject({ IdInstalador: 10, QtdContrato: 3 });
    expect(restored.detalhado[0]).toMatchObject({ IdComissionamento: 20, QtdContrato: 3 });
  });
});
