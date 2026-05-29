import React, { useMemo } from 'react';
import KPICard from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Users, Percent, AlertTriangle } from 'lucide-react';
import type { ExcessoMiscelanea } from '@/pages/ExcessoMiscelaneas';
import type { DadoTecnico } from '@/types/database';

interface Props {
  data: ExcessoMiscelanea[];
  dadosTecnicos: DadoTecnico[];
  tecnicoSupervisorMap: Map<string, string>;
}

const MiscPainelGeral: React.FC<Props> = ({ data, dadosTecnicos, tecnicoSupervisorMap }) => {
  const supervisorStats = useMemo(() => {
    // Get all technicians per supervisor
    const supTecnicos = new Map<string, Set<string>>();
    dadosTecnicos.forEach(d => {
      if (!supTecnicos.has(d.supervisor)) supTecnicos.set(d.supervisor, new Set());
      supTecnicos.get(d.supervisor)!.add(d.nome.toUpperCase());
    });

    // Get offending technicians per supervisor
    const ofensores = new Set<string>();
    data.forEach(d => ofensores.add(d.tecnico?.toUpperCase() || ''));

    const stats: { supervisor: string; totalTecnicos: number; ofensores: number; impacto: number }[] = [];

    supTecnicos.forEach((tecnicos, supervisor) => {
      const ofensoresSup = [...tecnicos].filter(t => ofensores.has(t)).length;
      const impacto = tecnicos.size > 0 ? (ofensoresSup / tecnicos.size) * 100 : 0;
      stats.push({ supervisor, totalTecnicos: tecnicos.size, ofensores: ofensoresSup, impacto });
    });

    return stats.sort((a, b) => b.impacto - a.impacto);
  }, [data, dadosTecnicos]);

  const totalSupervisores = supervisorStats.length;
  const mediaExcesso = totalSupervisores > 0
    ? supervisorStats.reduce((s, r) => s + r.impacto, 0) / totalSupervisores
    : 0;
  const totalOfensores = new Set(data.map(d => d.tecnico?.toUpperCase())).size;

  const getImpactoColor = (impacto: number) => {
    if (impacto >= 50) return 'text-destructive';
    if (impacto >= 25) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (impacto: number) => {
    if (impacto >= 50) return 'bg-destructive';
    if (impacto >= 25) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPICard title="Total de Supervisores" value={String(totalSupervisores)} icon={Users} color="primary" />
        <KPICard title="Média de Excesso" value={`${mediaExcesso.toFixed(1)}%`} icon={Percent} color="warning" />
        <KPICard title="Técnicos Ofensores" value={String(totalOfensores)} icon={AlertTriangle} color="destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Detalhamento por Supervisor</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-center">Téc. Ofensores</TableHead>
                <TableHead className="text-center">Impacto (%)</TableHead>
                <TableHead className="w-[200px]">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supervisorStats.filter(s => s.ofensores > 0).map(s => (
                <TableRow key={s.supervisor}>
                  <TableCell className="font-medium">{s.supervisor}</TableCell>
                  <TableCell className="text-center">{s.ofensores}</TableCell>
                  <TableCell className={`text-center font-semibold ${getImpactoColor(s.impacto)}`}>
                    {s.impacto.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(s.impacto)}`}
                        style={{ width: `${Math.min(s.impacto, 100)}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {supervisorStats.filter(s => s.ofensores > 0).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum dado encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MiscPainelGeral;