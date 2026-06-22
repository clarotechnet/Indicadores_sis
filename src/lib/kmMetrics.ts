import type { KmTecnica } from '@/types/database';

const normalizeAddress = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

const OPERATIONAL_DESTINATIONS = new Set([
  'BASE',
  'CASA',
  'CASA DO TECNICO',
  'CASA TECNICO',
]);

export const isKmServiceOrder = (row: Pick<KmTecnica, 'endereco_destino'>) => {
  const endereco = row.endereco_destino?.trim();
  if (!endereco) return false;

  const normalized = normalizeAddress(endereco);
  if (OPERATIONAL_DESTINATIONS.has(normalized)) return false;

  const hasStreetNumber = /\d/.test(endereco);
  const hasAddressSeparator = endereco.includes(',') || /\s-\s/.test(endereco);

  return hasStreetNumber && hasAddressSeparator;
};
