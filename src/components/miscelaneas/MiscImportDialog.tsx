import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Upload, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  cidade: string;
}

const COLUMN_MAP: Record<string, string> = {
  'DATA DE EXECUÇÃO DO SERVIÇO': 'data_execucao',
  'DATA DE EXECUCAO DO SERVICO': 'data_execucao',
  'DATA_EXECUCAO': 'data_execucao',
  'DATA EXECUÇÃO': 'data_execucao',
  'DATA EXECUCAO': 'data_execucao',
  'NÚMERO WO': 'numero_wo',
  'NUMERO WO': 'numero_wo',
  'NUMERO_WO': 'numero_wo',
  'WO': 'numero_wo',
  'CONTRATO': 'contrato',
  'OS': 'os',
  'SERVIÇO': 'servico',
  'SERVICO': 'servico',
  'QTDE': 'qtde',
  'QTD': 'qtde',
  'QUANTIDADE': 'qtde',
  'GRUPO': 'grupo',
  'CÓDIGO': 'codigo',
  'CODIGO': 'codigo',
  'EQUIPAMENTO': 'equipamento',
  'EQUIPE (TÉCNICO)': 'tecnico',
  'EQUIPE (TECNICO)': 'tecnico',
  'EQUIPE(TÉCNICO)': 'tecnico',
  'EQUIPE(TECNICO)': 'tecnico',
  'TÉCNICO': 'tecnico',
  'TECNICO': 'tecnico',
  'CONTROLADOR': 'controlador',
  'TIPO DE SERVIÇO': 'tipo_servico',
  'TIPO DE SERVICO': 'tipo_servico',
  'TIPO_SERVICO': 'tipo_servico',
};

const REQUIRED_FIELDS = ['data_execucao', 'numero_wo', 'tecnico'];

interface MiscImportRow {
  data_execucao: string;
  numero_wo: string;
  contrato: string;
  os: string;
  servico: string;
  qtde: number;
  grupo: string;
  codigo: string;
  equipamento: string;
  tecnico: string;
  controlador: string;
  tipo_servico: string;
  cidade: string;
}

type ExcelCell = string | number | boolean | null | undefined;
type ExcelRow = Record<string, ExcelCell>;

const parseDate = (val: unknown): string | null => {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  // DD/MM/YYYY
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
};

const emptyMiscRow = (cidade: string): MiscImportRow => ({
  data_execucao: '',
  numero_wo: '',
  contrato: '',
  os: '',
  servico: '',
  qtde: 0,
  grupo: '',
  codigo: '',
  equipamento: '',
  tecnico: '',
  controlador: '',
  tipo_servico: '',
  cidade,
});

const miscRowKey = (row: Pick<MiscImportRow, 'cidade' | 'data_execucao' | 'numero_wo' | 'contrato' | 'os' | 'codigo' | 'equipamento' | 'tecnico'>) =>
  [
    row.cidade,
    row.data_execucao,
    row.numero_wo.trim().toUpperCase(),
    row.contrato.trim().toUpperCase(),
    row.os.trim().toUpperCase(),
    row.codigo.trim().toUpperCase(),
    row.equipamento.trim().toUpperCase(),
    row.tecnico.trim().toUpperCase(),
  ].join('|');

const MiscImportDialog: React.FC<Props> = ({ open, onOpenChange, onImportComplete, cidade }) => {
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<ExcelRow>(ws);

      if (jsonRows.length === 0) {
        toast.error('Arquivo vazio');
        return;
      }

      // Map headers
      const firstRow = jsonRows[0];
      const headerMap: Record<string, string> = {};
      Object.keys(firstRow).forEach(h => {
        const normalized = h.trim().toUpperCase();
        if (COLUMN_MAP[normalized]) headerMap[h] = COLUMN_MAP[normalized];
      });

      const mappedFields = new Set(Object.values(headerMap));
      const missingRequired = REQUIRED_FIELDS.filter((field) => !mappedFields.has(field));
      if (missingRequired.length > 0) {
        toast.error(`Colunas obrigatórias não encontradas: ${missingRequired.join(', ')}`);
        return;
      }

      let skipped = 0;
      const rows = jsonRows.reduce<MiscImportRow[]>((acc, row) => {
        const mapped = emptyMiscRow(cidade);
        Object.entries(headerMap).forEach(([orig, dest]) => {
          let val = row[orig];
          if (dest === 'data_execucao') {
            val = parseDate(val) ?? '';
          } else if (dest === 'qtde') {
            val = parseInt(String(val ?? '0').replace(/[^\d]/g, ''), 10) || 0;
          } else {
            val = val != null ? String(val).trim() : '';
          }
          if (dest === 'qtde') {
            mapped.qtde = val as number;
          } else {
            mapped[dest as keyof Omit<MiscImportRow, 'qtde'>] = String(val);
          }
        });
        if (!mapped.data_execucao || !mapped.numero_wo || !mapped.tecnico) {
          skipped++;
          return acc;
        }
        acc.push(mapped);
        return acc;
      }, []);

      const seen = new Set<string>();
      const uniqueRows = rows.filter((row) => {
        const key = miscRowKey(row);
        if (seen.has(key)) {
          skipped++;
          return false;
        }
        seen.add(key);
        return true;
      });

      const datas = [...new Set(uniqueRows.map((row) => row.data_execucao))];
      let rowsToInsert = uniqueRows;

      if (datas.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from('excesso_miscelaneas')
          .select('cidade,data_execucao,numero_wo,contrato,os,codigo,equipamento,tecnico')
          .eq('cidade', cidade)
          .in('data_execucao', datas);

        if (existingError) {
          toast.error(`Erro ao verificar registros existentes: ${existingError.message}`);
          return;
        }

        const existingKeys = new Set(((existingRows as MiscImportRow[] | null) ?? []).map(miscRowKey));
        rowsToInsert = uniqueRows.filter((row) => {
          const alreadyExists = existingKeys.has(miscRowKey(row));
          if (alreadyExists) skipped++;
          return !alreadyExists;
        });
      }

      if (rowsToInsert.length === 0) {
        toast.info(skipped > 0 ? `${skipped} registros já existiam ou estavam incompletos.` : 'Nenhum registro válido para importar.');
        return;
      }

      const BATCH = 500;
      let inserted = 0;
      for (let i = 0; i < rowsToInsert.length; i += BATCH) {
        const batch = rowsToInsert.slice(i, i + BATCH);
        const { error } = await supabase.from('excesso_miscelaneas').insert(batch);
        if (error) {
          console.error('Erro ao importar:', error);
          toast.error(`Erro ao importar lote: ${error.message}`);
          break;
        }
        inserted += batch.length;
      }

      toast.success(`${inserted} registros importados com sucesso!${skipped > 0 ? ` ${skipped} ignorados.` : ''}`);
      onImportComplete();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro ao processar arquivo.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Excessos de Miscelâneas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione um arquivo Excel (.xlsx) com as colunas: Data de Execução, Número WO, Contrato, OS, Serviço, Qtde, Grupo, Código, Equipamento, Equipe (Técnico), Controlador, Tipo de Serviço.
          </p>
          <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {loading ? 'Importando...' : 'Clique para selecionar arquivo'}
            </span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={loading} />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MiscImportDialog;
