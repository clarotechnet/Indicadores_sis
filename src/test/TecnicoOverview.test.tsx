import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TecnicoOverview from '@/components/TecnicoOverview';
import type { HorarioPrimeiroCliente, IndicadorTecnico } from '@/types/database';

const indicatorRow = (date: string, nr35: number): IndicadorTecnico => ({
  id: `indicator-${date}`,
  data_referencia: date,
  login: 'Z498116',
  tecnico: 'TECNICO TESTE',
  supervisor: 'SUPERVISOR TESTE',
  cidade: 'NATAL/PARNAMIRIM',
  nr35,
  tnps: null,
  inspecao_e: null,
  revisita: null,
  os_dig: null,
  geo: null,
  ura: null,
  tec1: null,
  bds: null,
  created_at: `${date}T12:00:00Z`,
  updated_at: `${date}T12:00:00Z`,
});

const horarioRow = (date: string, horario: string): HorarioPrimeiroCliente => ({
  id: `schedule-${date}`,
  data_referencia: date,
  login: 'Z498116',
  tecnico: 'TECNICO TESTE',
  supervisor: 'SUPERVISOR TESTE',
  cidade: 'NATAL/PARNAMIRIM',
  horario_primeiro_cliente: horario,
  classificacao_horario: horario <= '08:15:59' ? 'ideal' : 'ruim',
  created_at: `${date}T12:00:00Z`,
  updated_at: `${date}T12:00:00Z`,
});

const cardContaining = (label: string) => {
  const card = screen.getByText(label, { exact: true }).closest('.shadow-sm');
  expect(card).not.toBeNull();
  return card as HTMLElement;
};

describe('TecnicoOverview', () => {
  it('uses the latest indicator update while averaging only the schedule rows', () => {
    render(
      <TecnicoOverview
        data={[
          indicatorRow('2026-08-01', 70),
          indicatorRow('2026-08-20', 90),
        ]}
        horarioData={[
          horarioRow('2026-08-19', '08:00:00'),
          horarioRow('2026-08-20', '08:20:00'),
        ]}
        cidade="NATAL/PARNAMIRIM"
      />,
    );

    expect(within(cardContaining('NR35')).getByText('90,0%')).toBeInTheDocument();
    expect(within(cardContaining('NR35')).getByText('Atualizado em 20/08/2026')).toBeInTheDocument();
    expect(within(cardContaining('Horário')).getByText('08:10')).toBeInTheDocument();
  });
});
