import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, CalendarDays, ClipboardList, Download, FileText, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildComissaoReport, buildComissaoWorkbookData } from '@/lib/comissaoReports';
import { supabase } from '@/lib/supabase';
import type { ComissaoPeriodo, ComissaoPeriodoDetalhe, Cidade } from '@/types/database';

type ComissaoReportsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cidade: Cidade;
};

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const formatCompetencia = (value: string) => {
  const label = new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const ComissaoReportsDialog = ({ open, onOpenChange, cidade }: ComissaoReportsDialogProps) => {
  const [periodos, setPeriodos] = useState<ComissaoPeriodo[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [details, setDetails] = useState<ComissaoPeriodoDetalhe[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    let active = true;
    const loadPeriods = async () => {
      setLoadingPeriods(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('comissao_periodos')
        .select('*')
        .eq('cidade', cidade)
        .order('competencia', { ascending: false });

      if (!active) return;
      setLoadingPeriods(false);

      if (queryError) {
        setPeriodos([]);
        setSelectedPeriodId('');
        setError(`${queryError.message}. Confirme se a migration do histórico mensal foi aplicada.`);
        return;
      }

      const nextPeriods = (data as ComissaoPeriodo[]) || [];
      setPeriodos(nextPeriods);
      setSelectedPeriodId((current) => (
        current && nextPeriods.some((periodo) => periodo.id === current)
          ? current
          : nextPeriods[0]?.id || ''
      ));
    };

    void loadPeriods();
    return () => {
      active = false;
    };
  }, [cidade, open]);

  useEffect(() => {
    if (!open || !selectedPeriodId) {
      setDetails([]);
      return;
    }

    let active = true;
    const loadDetails = async () => {
      setLoadingDetails(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('comissao_periodo_detalhes')
        .select('*')
        .eq('periodo_id', selectedPeriodId)
        .order('qtd_contrato', { ascending: false });

      if (!active) return;
      setLoadingDetails(false);

      if (queryError) {
        setDetails([]);
        setError(queryError.message);
        return;
      }

      setDetails((data as ComissaoPeriodoDetalhe[]) || []);
    };

    void loadDetails();
    return () => {
      active = false;
    };
  }, [open, selectedPeriodId]);

  const selectedPeriod = periodos.find((periodo) => periodo.id === selectedPeriodId);
  const report = useMemo(() => buildComissaoReport(details), [details]);
  const loading = loadingPeriods || loadingDetails;

  const handleExportExcel = async () => {
    if (!selectedPeriod) return;

    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const workbookData = buildComissaoWorkbookData(
        report,
        formatCompetencia(selectedPeriod.competencia),
        `${formatDate(selectedPeriod.data_inicio)} até ${formatDate(selectedPeriod.data_fim)}`,
        new Date(selectedPeriod.updated_at).toLocaleString('pt-BR'),
      );

      const workbook = XLSX.utils.book_new();
      const resumoSheet = XLSX.utils.aoa_to_sheet(workbookData.resumo);
      resumoSheet['!cols'] = [{ wch: 26 }, { wch: 32 }];

      const tecnicosSheet = XLSX.utils.aoa_to_sheet(workbookData.tecnicos);
      tecnicosSheet['!cols'] = [
        { wch: 16 },
        { wch: 34 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 20 },
      ];
      tecnicosSheet['!autofilter'] = { ref: `A1:F${Math.max(workbookData.tecnicos.length, 1)}` };

      const servicosSheet = XLSX.utils.aoa_to_sheet(workbookData.servicos);
      servicosSheet['!cols'] = [
        { wch: 22 },
        { wch: 48 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 },
      ];
      servicosSheet['!autofilter'] = { ref: `A1:E${Math.max(workbookData.servicos.length, 1)}` };

      XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
      XLSX.utils.book_append_sheet(workbook, tecnicosSheet, 'Por técnico');
      XLSX.utils.book_append_sheet(workbook, servicosSheet, 'Por serviço');
      XLSX.writeFile(workbook, `relatorio-comissao-${selectedPeriod.competencia.slice(0, 7)}.xlsx`, {
        compression: true,
      });
      toast.success('Relatório Excel gerado.');
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'Não foi possível gerar o relatório Excel.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedPeriod) return;

    setExporting('pdf');
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const competenceLabel = formatCompetencia(selectedPeriod.competencia);
      const periodLabel = `${formatDate(selectedPeriod.data_inicio)} até ${formatDate(selectedPeriod.data_fim)}`;
      const updatedLabel = new Date(selectedPeriod.updated_at).toLocaleString('pt-BR');

      doc.setFillColor(211, 24, 43);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Relatório de comissão', 12, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${competenceLabel} | ${periodLabel} | Atualizado em ${updatedLabel}`, 12, 17);

      const summaryItems = [
        ['Contratos', report.totals.contratos],
        ['Ordens de serviço', report.totals.os],
        ['Técnicos com produção', report.totals.tecnicos],
        ['Serviços executados', report.totals.servicos],
      ] as const;
      const boxGap = 4;
      const boxWidth = (pageWidth - 24 - boxGap * 3) / 4;

      summaryItems.forEach(([label, value], index) => {
        const x = 12 + index * (boxWidth + boxGap);
        doc.setFillColor(247, 248, 250);
        doc.setDrawColor(220, 224, 230);
        doc.roundedRect(x, 29, boxWidth, 18, 1.5, 1.5, 'FD');
        doc.setTextColor(90, 99, 112);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(label, x + 4, 35);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(formatNumber(value), x + 4, 43);
      });

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Contratos por técnico', 12, 55);
      autoTable(doc, {
        startY: 59,
        head: [['ID instalador', 'Técnico', 'Login', 'Contratos', 'Serviços', 'OS']],
        body: report.tecnicos.map((tecnico) => [
          tecnico.idInstalador,
          tecnico.tecnico,
          tecnico.login,
          tecnico.contratos,
          tecnico.servicos,
          tecnico.os,
        ]),
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: [31, 41, 55] },
        headStyles: { fillColor: [211, 24, 43], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 100 },
          2: { cellWidth: 30 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
        margin: { left: 12, right: 12, top: 12, bottom: 12 },
      });

      doc.addPage('a4', 'landscape');
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Contratos por serviço', 12, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(90, 99, 112);
      doc.text(`${competenceLabel} | ${periodLabel}`, 12, 22);
      autoTable(doc, {
        startY: 27,
        head: [['ID comissionamento', 'Serviço', 'Contratos', 'Técnicos', 'OS']],
        body: report.servicos.map((servico) => [
          servico.idComissionamento,
          servico.produto,
          servico.contratos,
          servico.tecnicos,
          servico.os,
        ]),
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: [31, 41, 55] },
        headStyles: { fillColor: [211, 24, 43], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 135 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        margin: { left: 12, right: 12, top: 12, bottom: 12 },
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 128, 140);
        doc.text(`Indicadores TEC | Página ${page} de ${pageCount}`, pageWidth - 12, 202, { align: 'right' });
      }

      doc.save(`relatorio-comissao-${selectedPeriod.competencia.slice(0, 7)}.pdf`);
      toast.success('Relatório PDF gerado.');
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'Não foi possível gerar o relatório PDF.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-6xl overflow-hidden p-0">
        <div className="border-b px-5 py-4 pr-12 sm:px-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              Relatórios de comissão
            </DialogTitle>
            <DialogDescription>
              Contratos consolidados por ID do técnico e por serviço em cada competência salva.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(92vh-105px)] space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full space-y-1.5 lg:max-w-sm">
              <label className="text-sm font-medium" htmlFor="comissao-relatorio-periodo">Competência</label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={loadingPeriods || periodos.length === 0}>
                <SelectTrigger id="comissao-relatorio-periodo">
                  <SelectValue placeholder={loadingPeriods ? 'Carregando...' : 'Selecione um mês'} />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((periodo) => (
                    <SelectItem key={periodo.id} value={periodo.id}>
                      {formatCompetencia(periodo.competencia)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {formatDate(selectedPeriod.data_inicio)} até {formatDate(selectedPeriod.data_fim)}
                </Badge>
                <span>Atualizado em {new Date(selectedPeriod.updated_at).toLocaleString('pt-BR')}</span>
                <Button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={loading || Boolean(exporting)}
                  size="sm"
                >
                  {exporting === 'excel' ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Baixar Excel
                </Button>
                <Button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={loading || Boolean(exporting)}
                  variant="outline"
                  size="sm"
                >
                  {exporting === 'pdf' ? <RefreshCw className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  Baixar PDF
                </Button>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && periodos.length === 0 && !error && (
            <div className="rounded-md border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
              Nenhuma competência foi salva. Faça uma busca para criar o primeiro histórico mensal.
            </div>
          )}

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" />
              Carregando relatório...
            </div>
          ) : selectedPeriod && !error ? (
            <>
              <div className="grid overflow-hidden rounded-md border sm:grid-cols-2 xl:grid-cols-4 xl:divide-x">
                {[
                  { label: 'Contratos', value: report.totals.contratos, icon: ClipboardList },
                  { label: 'Ordens de serviço', value: report.totals.os, icon: BriefcaseBusiness },
                  { label: 'Técnicos com produção', value: report.totals.tecnicos, icon: Users },
                  { label: 'Serviços executados', value: report.totals.servicos, icon: BarChart3 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-h-24 items-center justify-between gap-4 border-b p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:[&:nth-child(odd)]:border-r-0">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{formatNumber(value)}</p>
                    </div>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section aria-labelledby="relatorio-tecnicos-title" className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 id="relatorio-tecnicos-title" className="text-sm font-semibold">Contratos por técnico</h3>
                    <Badge variant="secondary">{report.tecnicos.length} técnicos</Badge>
                  </div>
                  <div className="max-h-[390px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead>Técnico / ID</TableHead>
                          <TableHead>Login</TableHead>
                          <TableHead className="text-right">Contratos</TableHead>
                          <TableHead className="text-right">Serviços</TableHead>
                          <TableHead className="text-right">OS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.tecnicos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                              Nenhum técnico com produção nesta competência.
                            </TableCell>
                          </TableRow>
                        ) : (
                          report.tecnicos.map((tecnico) => (
                            <TableRow key={tecnico.idInstalador}>
                              <TableCell>
                                <p className="min-w-44 font-medium">{tecnico.tecnico}</p>
                                <p className="text-xs text-muted-foreground">ID {tecnico.idInstalador}</p>
                              </TableCell>
                              <TableCell>{tecnico.login}</TableCell>
                              <TableCell className="text-right font-semibold">{formatNumber(tecnico.contratos)}</TableCell>
                              <TableCell className="text-right">{formatNumber(tecnico.servicos)}</TableCell>
                              <TableCell className="text-right">{formatNumber(tecnico.os)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section aria-labelledby="relatorio-servicos-title" className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 id="relatorio-servicos-title" className="text-sm font-semibold">Contratos por serviço</h3>
                    <Badge variant="secondary">{report.servicos.length} serviços</Badge>
                  </div>
                  <div className="max-h-[390px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="text-right">Contratos</TableHead>
                          <TableHead className="text-right">Técnicos</TableHead>
                          <TableHead className="text-right">OS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.servicos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                              Nenhum serviço com produção nesta competência.
                            </TableCell>
                          </TableRow>
                        ) : (
                          report.servicos.map((servico) => (
                            <TableRow key={servico.idComissionamento}>
                              <TableCell>
                                <p className="min-w-44 font-medium">{servico.produto}</p>
                                <p className="text-xs text-muted-foreground">ID {servico.idComissionamento}</p>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{formatNumber(servico.contratos)}</TableCell>
                              <TableCell className="text-right">{formatNumber(servico.tecnicos)}</TableCell>
                              <TableCell className="text-right">{formatNumber(servico.os)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComissaoReportsDialog;
