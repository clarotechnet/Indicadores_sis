import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { KM_SUMMARY_COLUMNS } from '@/lib/kmQueries';

describe('KM summary query', () => {
  it('loads the destination needed to count service orders without loading map coordinates', () => {
    const columns = KM_SUMMARY_COLUMNS.split(',');

    expect(columns).toContain('endereco_destino');
    expect(columns).not.toContain('coord_origem_x');
    expect(columns).not.toContain('coord_destino_x');
  });
});
