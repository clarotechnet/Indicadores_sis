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

const parseDate = (val: any): string | null => {
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
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

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

      const rows = jsonRows.map(row => {
        const mapped: Record<string, any> = { cidade };
        Object.entries(headerMap).forEach(([orig, dest]) => {
          let val = row[orig];
          if (dest === 'data_execucao') {
            val = parseDate(val);
          } else if (dest === 'qtde') {
            val = parseInt(String(val ?? '0').replace(/[^\d]/g, ''), 10) || 0;
          } else {
            val = val != null ? String(val).trim() : '';
          }
          mapped[dest] = val;
        });
        return mapped;
      });

      const BATCH = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase.from('excesso_miscelaneas').insert(batch as any);
        if (error) {
          console.error('Erro ao importar:', error);
          toast.error(`Erro ao importar lote: ${error.message}`);
          break;
        }
        inserted += batch.length;
      }

      toast.success(`${inserted} registros importados com sucesso!`);
      onImportComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
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