import type { DadoTecnico, KmTecnica } from '@/types/database';

export const MISSING_KM_FRONT = 'Sem frente cadastrada';

export const TECHNICIAN_FRONT_OPTIONS = [
  'ADESÃO',
  'ADESÃO/DUPLA',
  'ADESÃO/INDIVIDUAL',
  'DESCONEXÃO',
  'MRO',
  'MRO/DESCONEXÃO',
  'SERVIÇOS',
  'VT',
];

const normalizeKey = (value: string) => value.trim().toLocaleUpperCase('pt-BR');

export const normalizeKmFront = (value?: string | null): string => {
  const text = value?.trim().replace(/\s*\/\s*/g, '/').toLocaleUpperCase('pt-BR') ?? '';
  const key = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return TECHNICIAN_FRONT_OPTIONS.find((front) => (
    front.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === key
  )) ?? text;
};

export const technicianFrontKey = (cidade: string, login: string) => (
  `${normalizeKey(cidade)}:${normalizeKey(login)}`
);

export const createTechnicianFrontMap = (technicians: Pick<DadoTecnico, 'login' | 'cidade' | 'frente'>[]) => (
  new Map(technicians.map((technician) => [
    technicianFrontKey(technician.cidade, technician.login),
    normalizeKmFront(technician.frente),
  ]))
);

export const applyKmFronts = <T extends Pick<KmTecnica, 'login_tecnico' | 'cidade' | 'frente'>>(
  rows: T[],
  fronts: ReadonlyMap<string, string>,
): T[] => rows.map((row) => ({
  ...row,
  frente: fronts.get(technicianFrontKey(row.cidade, row.login_tecnico))
    || normalizeKmFront(row.frente)
    || MISSING_KM_FRONT,
}));

// The technician's current assignment is not part of a route's identity.
export const kmRouteKey = (
  row: Pick<KmTecnica, 'login_tecnico' | 'data' | 'trecho' | 'endereco_destino' | 'distancia_km' | 'cidade'>,
) => [
  normalizeKey(row.cidade),
  normalizeKey(row.login_tecnico),
  row.data,
  normalizeKey(row.trecho),
  normalizeKey(row.endereco_destino),
  String(row.distancia_km),
].join('|');
