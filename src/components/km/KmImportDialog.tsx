import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import { notifyImportCompleted } from '@/lib/notifications';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface KmImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const EXPECTED_COLUMNS = [
  'LOGIN DO TÉCNICO', 'LOGIN DO TECNICO', 'LOGIN',
  'RECURSO',
  'DATA',
  'TRECHO',
  'ENDEREÇO DESTINO', 'ENDERECO DESTINO',
  'DISTÂNCIA (KM)', 'DISTANCIA (KM)', 'DISTÂNCIA', 'DISTANCIA', 'KM',
  'FRENTE',
  'CIDADE',
];

interface KmImportRow {
  login_tecnico: string;
  recurso: string;
  data: string;
  trecho: string;
  endereco_destino: string;
  distancia_km: number;
  frente: string;
  cidade: string;
  coord_origem_x: number | null;
  coord_origem_y: number | null;
  coord_destino_x: number | null;
  coord_destino_y: number | null;
}

type ExcelCell = string | number | boolean | null | undefined;
type ExcelRow = Record<string, ExcelCell>;

function findColumn(headers: string[], ...candidates: string[]): string | null {
  for (const c of candidates) {
    const found = headers.find(h => h.toUpperCase().trim() === c);
    if (found) return found;
  }
  return null;
}

function parseDecimal(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(/\s/g, '');
  // Handle comma as decimal separator: "7,7" → 7.7
  const normalized = str.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function parseDate(val: unknown): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  const parts = str.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return parts.join('-');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

function rowKey(row: Pick<KmImportRow, 'login_tecnico' | 'data' | 'trecho' | 'endereco_destino' | 'distancia_km' | 'frente' | 'cidade'>): string {
  return [
    row.cidade,
    row.login_tecnico.toUpperCase(),
    row.data,
    row.trecho.trim().toUpperCase(),
    row.endereco_destino.trim().toUpperCase(),
    String(row.distancia_km),
    row.frente.trim().toUpperCase(),
  ].join('|');
}

const KmImportDialog: React.FC<KmImportDialogProps> = ({ open, onOpenChange, onImportComplete }) => {
  const { selectedCity } = useCity();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[]; skipped: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      if (!selectedCity) {
        setResult({ success: 0, errors: ['Selecione uma cidade antes de importar.'], skipped: 0 });
        setLoading(false);
        return;
      }

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws);

      if (jsonData.length === 0) {
        setResult({ success: 0, errors: ['Arquivo vazio.'], skipped: 0 });
        setLoading(false);
        return;
      }

      const rawHeaders = Object.keys(jsonData[0]);

      const colLogin = findColumn(rawHeaders, 'LOGIN DO TÉCNICO', 'LOGIN DO TECNICO', 'LOGIN');
      const colRecurso = findColumn(rawHeaders, 'RECURSO');
      const colData = findColumn(rawHeaders, 'DATA');
      const colTrecho = findColumn(rawHeaders, 'TRECHO');
      const colEndereco = findColumn(rawHeaders, 'ENDEREÇO DESTINO', 'ENDERECO DESTINO');
      const colDistancia = findColumn(rawHeaders, 'DISTÂNCIA (KM)', 'DISTANCIA (KM)', 'DISTÂNCIA', 'DISTANCIA', 'KM');
      const colFrente = findColumn(rawHeaders, 'FRENTE');
      const colCidade = findColumn(rawHeaders, 'CIDADE');
      const colCoordOrigemX = findColumn(rawHeaders, 'COORD ORIGEM X', 'COORD_ORIGEM_X');
      const colCoordOrigemY = findColumn(rawHeaders, 'COORD ORIGEM Y', 'COORD_ORIGEM_Y');
      const colCoordDestinoX = findColumn(rawHeaders, 'COORD DESTINO X', 'COORD_DESTINO_X');
      const colCoordDestinoY = findColumn(rawHeaders, 'COORD DESTINO Y', 'COORD_DESTINO_Y');

      if (!colLogin) {
        setResult({ success: 0, errors: ['Coluna "Login do Técnico" não encontrada.'], skipped: 0 });
        setLoading(false);
        return;
      }
      if (!colData || !colDistancia) {
        setResult({ success: 0, errors: ['Colunas obrigatórias não encontradas: DATA e DISTÂNCIA/KM.'], skipped: 0 });
        setLoading(false);
        return;
      }

      let skipped = 0;
      const errors: string[] = [];
      const rows: KmImportRow[] = [];

      for (const row of jsonData) {
        const login = String(row[colLogin!] || '').trim();
        if (!login) { skipped++; continue; }

        const cidade = colCidade ? String(row[colCidade] || '').trim().toUpperCase() : selectedCity;
        if (cidade && cidade !== selectedCity) {
          skipped++;
          continue;
        }

        rows.push({
          login_tecnico: login.toUpperCase(),
          recurso: colRecurso ? String(row[colRecurso] || '').trim() : '',
          data: parseDate(colData ? row[colData] : null),
          trecho: colTrecho ? String(row[colTrecho] || '').trim() : '',
          endereco_destino: colEndereco ? String(row[colEndereco] || '').trim() : '',
          distancia_km: parseDecimal(colDistancia ? row[colDistancia] : 0),
          frente: colFrente ? String(row[colFrente] || '').trim() : '',
          cidade: cidade || selectedCity,
          coord_origem_x: colCoordOrigemX ? parseDecimal(row[colCoordOrigemX]) || null : null,
          coord_origem_y: colCoordOrigemY ? parseDecimal(row[colCoordOrigemY]) || null : null,
          coord_destino_x: colCoordDestinoX ? parseDecimal(row[colCoordDestinoX]) || null : null,
          coord_destino_y: colCoordDestinoY ? parseDecimal(row[colCoordDestinoY]) || null : null,
        });
      }

      const seen = new Set<string>();
      const uniqueRows = rows.filter((row) => {
        const key = rowKey(row);
        if (seen.has(key)) {
          skipped++;
          return false;
        }
        seen.add(key);
        return true;
      });

      const datas = [...new Set(uniqueRows.map((row) => row.data))];
      let rowsToInsert = uniqueRows;
      if (datas.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from('km_tecnica')
          .select('login_tecnico,data,trecho,endereco_destino,distancia_km,frente,cidade')
          .eq('cidade', selectedCity)
          .in('data', datas);

        if (existingError) {
          errors.push(`Erro ao verificar registros existentes: ${existingError.message}`);
        } else {
          const existingKeys = new Set(((existingRows as KmImportRow[] | null) ?? []).map(rowKey));
          rowsToInsert = uniqueRows.filter((row) => {
            const alreadyExists = existingKeys.has(rowKey(row));
            if (alreadyExists) skipped++;
            return !alreadyExists;
          });
        }
      }

      // Insert in batches of 500
      let inserted = 0;
      for (let i = 0; i < rowsToInsert.length; i += 500) {
        const batch = rowsToInsert.slice(i, i + 500);
        const { error } = await supabase.from('km_tecnica').insert(batch);
        if (error) {
          errors.push(`Erro ao salvar lote ${Math.floor(i / 500) + 1}: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      setResult({ success: inserted, errors: errors.slice(0, 20), skipped });
      if (inserted > 0 && errors.length === 0) {
        await notifyImportCompleted({
          profile,
          cidade: selectedCity,
          origem: 'KM Rotas',
          total: inserted,
          skipped,
          fileName: file.name,
        });
        onImportComplete();
      }
    } catch (err: unknown) {
      setResult({ success: 0, errors: [err instanceof Error ? err.message : 'Erro ao processar arquivo.'], skipped: 0 });
    }

    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar KM - Arquivo Excel
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel com as colunas: Login, Recurso, Data, Trecho, Endereço Destino, Distância (km), Frente, Cidade.
            <br />Cidade selecionada: <strong>{selectedCity}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="km-excel-import"
          />

          {!loading && !result && (
            <Button
              variant="outline"
              className="w-full h-32 border-dashed border-2 flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-muted-foreground">Clique para selecionar arquivo</span>
              <span className="text-xs text-muted-foreground">.xlsx ou .xls</span>
            </Button>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando arquivo...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>{result.success} registros importados</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>{result.skipped} registros ignorados</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                  Importar outro
                </Button>
                <Button size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KmImportDialog;
