import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import {
  applyActiveTechnicianMetadata,
  DASHBOARD_PAGE_SIZE,
  fetchDashboardPages,
} from '@/lib/dashboardQueries';

describe('dashboard queries', () => {
  it('uses a single request when the first page is not full', async () => {
    const fetchPage = vi.fn(async () => [1, 2, 3]);

    await expect(fetchDashboardPages(fetchPage)).resolves.toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledOnce();
    expect(fetchPage).toHaveBeenCalledWith(0, DASHBOARD_PAGE_SIZE - 1);
  });

  it('loads large result sets in concurrent batches after the first page', async () => {
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0 || from === DASHBOARD_PAGE_SIZE) {
        return Array.from({ length: DASHBOARD_PAGE_SIZE }, (_, index) => from + index);
      }
      if (from === DASHBOARD_PAGE_SIZE * 2) return [from];
      return [];
    });

    const rows = await fetchDashboardPages(fetchPage);

    expect(rows).toHaveLength(DASHBOARD_PAGE_SIZE * 2 + 1);
    expect(fetchPage.mock.calls.map(([from]) => from)).toEqual([
      0,
      DASHBOARD_PAGE_SIZE,
      DASHBOARD_PAGE_SIZE * 2,
      DASHBOARD_PAGE_SIZE * 3,
      DASHBOARD_PAGE_SIZE * 4,
    ]);
  });

  it('keeps only active technicians and applies their current metadata', () => {
    const rows = [
      { login: 'z1', tecnico: 'Nome antigo', supervisor: 'Supervisor antigo', cidade: 'RECIFE' },
      { login: 'z2', tecnico: 'Inativo', supervisor: 'Outro', cidade: 'RECIFE' },
    ];
    const technicians = [
      { login: 'Z1', nome: 'Nome atual', supervisor: 'Supervisor atual', cidade: 'NATAL/PARNAMIRIM', ativo: true },
    ];

    expect(applyActiveTechnicianMetadata(rows, technicians)).toEqual([
      { login: 'Z1', tecnico: 'Nome atual', supervisor: 'Supervisor atual', cidade: 'NATAL/PARNAMIRIM' },
    ]);
  });
});
