import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), fetchRows: vi.fn(), notify: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
vi.mock('@/lib/kmQueries', () => ({ fetchKmSummaryRows: mocks.fetchRows }));
vi.mock('@/lib/notifications', () => ({ notifyImportCompleted: mocks.notify }));
vi.mock('@/contexts/CityContext', () => ({ useCity: () => ({ selectedCity: 'NATAL/PARNAMIRIM' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'admin' } }) }));

import KmImportDialog from '@/components/km/KmImportDialog';

const upload = (rows: Record<string, string | number>[]) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Dados');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const file = new File([buffer], 'rotas.xlsx');
  Object.defineProperty(file, 'arrayBuffer', { value: async () => buffer });
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
};

const route = {
  Login: 'Z123', Recurso: 'TECNICO TESTE', Data: '12/11/2026',
  Trecho: 'BASE - CLIENTE', 'Endereço Destino': 'RUA TESTE, 10', 'Distância (km)': 7.7,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.fetchRows.mockResolvedValue([]);
  mocks.notify.mockResolvedValue(undefined);
});

describe('KM spreadsheet import', () => {
  it('accepts a file without a front and skips existing routes even when their stored front is different', async () => {
    mocks.fetchRows.mockResolvedValue([{
      login_tecnico: 'Z123', recurso: 'TECNICO TESTE', data: '2026-11-12',
      trecho: route.Trecho, endereco_destino: route['Endereço Destino'], distancia_km: 7.7,
      cidade: 'NATAL/PARNAMIRIM', frente: 'VT',
    }]);
    const onComplete = vi.fn();
    render(<KmImportDialog open onOpenChange={vi.fn()} onImportComplete={onComplete} />);
    upload([route, { ...route, 'Endereço Destino': 'RUA TESTE, 20' }]);

    await screen.findByText('1 registros importados');
    expect(screen.getByText('1 registros ignorados')).toBeInTheDocument();
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ endereco_destino: 'RUA TESTE, 20', frente: '' })]);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('accepts the Tipo/Serviço header used by the source sheet', async () => {
    render(<KmImportDialog open onOpenChange={vi.fn()} onImportComplete={vi.fn()} />);
    upload([{ ...route, 'Tipo/Serviço': 'ADESÂO/INDIVIDUAL' }]);

    await screen.findByText('1 registros importados');
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ frente: 'ADESÃO/INDIVIDUAL' })]);
  });

  it('stops before inserting if the duplicate check fails', async () => {
    mocks.fetchRows.mockRejectedValue(new Error('Erro ao buscar km_tecnica: timeout'));
    render(<KmImportDialog open onOpenChange={vi.fn()} onImportComplete={vi.fn()} />);
    upload([route]);

    await screen.findByText('Erro ao buscar km_tecnica: timeout');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
