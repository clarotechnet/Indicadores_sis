import { describe, expect, it } from 'vitest';

import { isKmServiceOrder } from '@/lib/kmMetrics';

describe('isKmServiceOrder', () => {
  it('counts only complete destination addresses as OS', () => {
    expect(isKmServiceOrder({ endereco_destino: 'R S BENTO, 665 - NORDESTE' })).toBe(true);
    expect(isKmServiceOrder({ endereco_destino: 'AV NEVALDO ROCHA, 3775 - TIROL' })).toBe(true);
    expect(isKmServiceOrder({ endereco_destino: 'Casa do Tecnico' })).toBe(false);
    expect(isKmServiceOrder({ endereco_destino: 'Casa do Técnico' })).toBe(false);
    expect(isKmServiceOrder({ endereco_destino: 'Base' })).toBe(false);
    expect(isKmServiceOrder({ endereco_destino: '' })).toBe(false);
  });
});
