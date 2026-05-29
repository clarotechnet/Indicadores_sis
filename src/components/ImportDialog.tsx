import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useCity } from '@/contexts/CityContext';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { DadoTecnico } from '@/types/database';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const COLUMN_MAP: Record<string, string> = {
  'NR35': 'nr35',
  'TNPS': 'tnps',
  'INSPEÇÃO E.': 'inspecao_e',
  'INSPECAO E.': 'inspecao_e',
  'INSPECAO_E': 'inspecao_e',
  'INSPEÇÃO': 'inspecao_e',
  'INSPECAO': 'inspecao_e',
  'INSPECÃO': 'inspecao_e',
  'REVISITA': 'revisita',
  'OS_DIG': 'os_dig',
  'GEO': 'geo',
  'URA': 'ura',
  'TEC1': 'tec1',
  'BDS': 'bds',
  'HORARIO_PRIMEIRO_CLIENTE': 'horario_primeiro_cliente',
  'HORARIOS': 'horario_primeiro_cliente',
  'HORÁRIOS': 'horario_primeiro_cliente',
  'HORARIO': 'horario_primeiro_cliente',
  'HORÁRIO': 'horario_primeiro_cliente',
};

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onOpenChange, onImportComplete }) => {
  const { selectedCity } = useCity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[]; skipped: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (jsonData.length === 0) {
        setResult({ success: 0, errors: ['Arquivo vazio.'], skipped: 0 });
        setLoading(false);
        return;
      }

      const headers = Object.keys(jsonData[0]).map((h) => h.trim().toUpperCase());
      if (!headers.includes('LOGIN') && !headers.includes('LOGIN_TECNICO')) {
        setResult({ success: 0, errors: ['Coluna LOGIN ou LOGIN_TECNICO não encontrada no arquivo.'], skipped: 0 });
        setLoading(false);
        return;
      }

      // Check for DATA column
      const hasData = headers.includes('DATA') || headers.includes('DATA_REFERENCIA');
      const dataKey = Object.keys(jsonData[0]).find((k) => ['DATA', 'DATA_REFERENCIA'].includes(k.trim().toUpperCase()));

      // Fetch dados_tecnicos for the selected city
      const { data: dadosTecnicos, error: fetchError } = await supabase
        .from('dados_tecnicos')
        .select('*')
        .eq('cidade', selectedCity);

        if (fetchError) {
        setResult({ success: 0, errors: [`Erro ao buscar técnicos: ${fetchError.message}. Tente fazer login novamente.`], skipped: 0 });
        setLoading(false);
        return;
      }

      if (!dadosTecnicos || dadosTecnicos.length === 0) {
        setResult({ success: 0, errors: [`Nenhum técnico encontrado para a cidade "${selectedCity}". Verifique se está logado e se a cidade está correta.`], skipped: 0 });
        setLoading(false);
        return;
      }

      const tecnicoMap = new Map<string, DadoTecnico>();
      (dadosTecnicos || []).forEach((dt: DadoTecnico) => {
        tecnicoMap.set(dt.login.toUpperCase(), dt);
      });

      // Detect which indicator columns exist
      const detectedCols = Object.keys(jsonData[0])
        .filter((k) => COLUMN_MAP[k.trim().toUpperCase()])
        .map((k) => ({ original: k, mapped: COLUMN_MAP[k.trim().toUpperCase()] }));

      const hasHorario = detectedCols.some((c) => c.mapped === 'horario_primeiro_cliente');
      const indicatorCols = detectedCols.filter((c) => c.mapped !== 'horario_primeiro_cliente');

      // Detect HORA_ENTRADA column for comparativo_hro
      const horaEntradaKey = Object.keys(jsonData[0]).find((k) => k.trim().toUpperCase() === 'HORA_ENTRADA');
      const hasHoraEntrada = !!horaEntradaKey;

      let success = 0;
      let skipped = 0;
      const errors: string[] = [];
      const indicadorRows: any[] = [];
      const horarioRows: any[] = [];
      const horaEntradaRows: any[] = [];
      for (const row of jsonData) {
        const loginKey = Object.keys(row).find((k) => ['LOGIN', 'LOGIN_TECNICO'].includes(k.trim().toUpperCase()));
        if (!loginKey) continue;
        const login = String(row[loginKey]).trim().toUpperCase();
        const tecnico = tecnicoMap.get(login);

        if (!tecnico) {
          errors.push(`Login "${login}" não encontrado em dados_tecnicos.`);
          skipped++;
          continue;
        }

        if (tecnico.cidade !== selectedCity) {
          skipped++;
          continue;
        }

        let dataRef = '';
        if (dataKey && row[dataKey]) {
          const raw = row[dataKey];
          if (typeof raw === 'number') {
            // Excel date serial
            const d = XLSX.SSF.parse_date_code(raw);
            dataRef = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          } else {
            const parts = String(raw).split(/[\/\-]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) dataRef = parts.join('-');
              else dataRef = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              dataRef = String(raw);
            }
          }
        } else {
          dataRef = new Date().toISOString().split('T')[0];
        }

        // Indicadores row
        if (indicatorCols.length > 0) {
          const indicadorRow: any = {
            data_referencia: dataRef,
            login: tecnico.login,
            tecnico: tecnico.nome,
            supervisor: tecnico.supervisor,
            cidade: tecnico.cidade,
          };
          indicatorCols.forEach((col) => {
            const val = row[col.original];
            indicadorRow[col.mapped] = val !== undefined && val !== '' ? Number(val) : null;
          });
          indicadorRows.push(indicadorRow);
        }

        // Horario row
        if (hasHorario) {
          const horarioCol = detectedCols.find((c) => c.mapped === 'horario_primeiro_cliente');
          if (horarioCol) {
            const rawHorario = row[horarioCol.original];
            let horarioVal = '';
            if (typeof rawHorario === 'number' && rawHorario > 0 && rawHorario < 1) {
              // Excel serial time (fraction of day) -> HH:MM:SS
              const totalSeconds = Math.round(rawHorario * 86400);
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = totalSeconds % 60;
              horarioVal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            } else {
              horarioVal = String(rawHorario || '').trim();
            }
            if (horarioVal) {
              // Classify
              let classificacao: 'ideal' | 'ruim' = 'ruim';
              const timeParts = horarioVal.split(':').map(Number);
              if (timeParts.length >= 2) {
                const h = timeParts[0];
                const m = timeParts[1];
                const s = timeParts[2] || 0;
                const totalSeconds = h * 3600 + m * 60 + s;
                const idealStart = 7 * 3600 + 50 * 60; // 07:50:00
                const idealEnd = 8 * 3600 + 15 * 60 + 59; // 08:15:59
                if (totalSeconds >= idealStart && totalSeconds <= idealEnd) {
                  classificacao = 'ideal';
                }
              }

              horarioRows.push({
                data_referencia: dataRef,
                login: tecnico.login,
                tecnico: tecnico.nome,
                supervisor: tecnico.supervisor,
                cidade: tecnico.cidade,
                horario_primeiro_cliente: horarioVal,
                classificacao_horario: classificacao,
              });
            }
          }
        }

        // Hora entrada row
        if (hasHoraEntrada && horaEntradaKey) {
          const rawHora = row[horaEntradaKey];
          let horaVal = '';
          if (typeof rawHora === 'number' && rawHora > 0 && rawHora < 1) {
            const totalSeconds = Math.round(rawHora * 86400);
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            horaVal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          } else {
            horaVal = String(rawHora || '').trim();
          }
          if (horaVal) {
            horaEntradaRows.push({
              data: dataRef,
              login_tecnico: tecnico.login,
              hora_entrada: horaVal,
              cidade: tecnico.cidade,
            });
          }
        }

        success++;
      }

      // Upsert indicadores
      if (indicadorRows.length > 0) {
        const { error } = await supabase
          .from('indicadores_tecnicos')
          .upsert(indicadorRows as any, { onConflict: 'login,data_referencia' });
        if (error) errors.push(`Erro ao salvar indicadores: ${error.message}`);
      }

      // Upsert horarios
      if (horarioRows.length > 0) {
        const { error } = await supabase
          .from('horario_primeiro_cliente')
          .upsert(horarioRows as any, { onConflict: 'login,data_referencia' });
        if (error) errors.push(`Erro ao salvar horários: ${error.message}`);
      }

      // Insert hora_entrada
      if (horaEntradaRows.length > 0) {
        const { error } = await supabase
          .from('horario_entrada_tecnico')
          .insert(horaEntradaRows as any);
        if (error) errors.push(`Erro ao salvar hora entrada: ${error.message}`);
      }

      setResult({ success, errors: errors.slice(0, 20), skipped });
      if (success > 0) onImportComplete();
    } catch (err: any) {
      setResult({ success: 0, errors: [err.message || 'Erro ao processar arquivo.'], skipped: 0 });
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
            Importar Arquivo Excel
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel contendo a coluna LOGIN e os indicadores.
            Dados serão importados apenas para a cidade: <strong>{selectedCity}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="excel-import"
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
                <Button variant="outline" size="sm" onClick={() => { setResult(null); }}>
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

export default ImportDialog;