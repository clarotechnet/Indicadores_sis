import { describe, expect, it } from 'vitest';
import { applyKmFronts, createTechnicianFrontMap, kmRouteKey, MISSING_KM_FRONT, normalizeKmFront } from '@/lib/kmFronts';

const route = {
  login_tecnico: ' Z123 ',
  cidade: 'NATAL/PARNAMIRIM',
  frente: 'DESCONEXÃO',
  data: '2026-11-12',
  trecho: 'BASE - CLIENTE',
  endereco_destino: 'RUA TESTE, 10',
  distancia_km: 7.7,
};

describe('KM technician fronts', () => {
  it('uses the registered front while preserving the original imported data', () => {
    const fronts = createTechnicianFrontMap([{ login: 'z123', cidade: route.cidade, frente: 'VT' }]);
    expect(applyKmFronts([route], fronts)[0].frente).toBe('VT');
    expect(route.frente).toBe('DESCONEXÃO');
  });

  it('uses the file front when the technician has no front', () => {
    const fronts = createTechnicianFrontMap([{ login: 'Z123', cidade: route.cidade, frente: null }]);
    expect(applyKmFronts([{ ...route, frente: ' ADESÂO / INDIVIDUAL ' }], fronts)[0].frente).toBe('ADESÃO/INDIVIDUAL');
  });

  it('identifies missing fronts without discarding the route', () => {
    const rows = [{ ...route, frente: '' }];
    expect(applyKmFronts(rows, new Map())).toEqual([{ ...route, frente: MISSING_KM_FRONT }]);
  });

  it('keeps assignments separate for the same login in different cities', () => {
    const fronts = createTechnicianFrontMap([
      { login: 'Z123', cidade: route.cidade, frente: 'VT' },
      { login: 'Z123', cidade: 'RECIFE', frente: 'MRO' },
    ]);
    expect(applyKmFronts([route, { ...route, cidade: 'RECIFE' }], fronts).map((row) => row.frente)).toEqual(['VT', 'MRO']);
  });

  it('includes routes with empty file fronts when filtering by the registered front', () => {
    const fronts = createTechnicianFrontMap([{ login: 'Z123', cidade: route.cidade, frente: 'VT' }]);
    const rows = [route, { ...route, frente: '' }, { ...route, login_tecnico: 'Z456', frente: 'MRO' }];
    expect(applyKmFronts(rows, fronts).filter((row) => row.frente === 'VT')).toHaveLength(2);
  });

  it('normalizes known front spellings and keeps custom front names', () => {
    expect(normalizeKmFront('DESCONEXÂO')).toBe('DESCONEXÃO');
    expect(normalizeKmFront('servicos')).toBe('SERVIÇOS');
    expect(normalizeKmFront('Operacao nova')).toBe('OPERACAO NOVA');
    expect(normalizeKmFront(undefined)).toBe('');
  });
});

describe('KM import identity', () => {
  it('does not duplicate a route when the optional file front changes or is removed', () => {
    const withoutFront = { ...route, frente: '' };
    const differentFront = { ...route, frente: 'VT' };
    expect(kmRouteKey(withoutFront)).toBe(kmRouteKey(route));
    expect(kmRouteKey(differentFront)).toBe(kmRouteKey(route));
  });

  it('still distinguishes different destinations, dates, distances and cities', () => {
    for (const change of [
      { endereco_destino: 'RUA TESTE, 20' },
      { data: '2026-11-13' },
      { distancia_km: 8 },
      { cidade: 'RECIFE' },
    ]) {
      expect(kmRouteKey({ ...route, ...change })).not.toBe(kmRouteKey(route));
    }
  });
});
