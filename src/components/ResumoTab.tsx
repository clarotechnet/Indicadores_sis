import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, BarChart3, CheckCircle2, ClipboardList, Target, Users } from 'lucide-react';

import KPICard from '@/components/KPICard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IndicadorKey, IndicadorTecnico } from '@/types/database';
import { INDICADOR_LABELS, INDICADOR_METAS, atingeMeta } from '@/types/database';

interface ResumoTabProps {
  data: IndicadorTecnico[];
  cidade: string;
  isDateFiltered?: boolean;
}

const KEYS: IndicadorKey[] = ['nr35', 'tnps', 'inspecao_e', 'revisita', 'os_dig', 'geo', 'ura', 'tec1', 'bds'];

type MetricRow = Pick<IndicadorTecnico, 'login' | 'tecnico' | 'supervisor'> & Record<IndicadorKey, number | null>;

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const normalizeScore = (key: IndicadorKey, value: number) => {
  if (key === 'revisita') {
    const target = INDICADOR_METAS.revisita.valor;
    return clampPercent(((target - value) / target) * 100);
  }

  return clampPercent(value);
};

const formatPercent = (value: number) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const formatNumber = (value: number) => value.toLocaleString('pt-BR');

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });

const ResumoTab: React.FC<ResumoTabProps> = ({ data, cidade, isDateFiltered = false }) => {
  const latestDataForMetrics = React.useMemo(() => {
    if (isDateFiltered) return data as MetricRow[];

    const technicianNames: Record<string, string> = {};
    const technicianSupervisors: Record<string, string> = {};
    const latestRecordByKey: Record<string, Record<string, { valor: number; data: string }>> = {};

    data.forEach((row) => {
      technicianNames[row.login] = row.tecnico;
      technicianSupervisors[row.login] = row.supervisor;

      if (!latestRecordByKey[row.login]) {
        latestRecordByKey[row.login] = {};
      }

      KEYS.forEach((key) => {
        const value = row[key];
        if (value === null) return;

        const existing = latestRecordByKey[row.login][key];
        if (!existing || row.data_referencia > existing.data) {
          latestRecordByKey[row.login][key] = { valor: value, data: row.data_referencia };
        }
      });
    });

    return Object.entries(latestRecordByKey).map(([login, metrics]) => {
      const entry: MetricRow = {
        login,
        tecnico: technicianNames[login],
        supervisor: technicianSupervisors[login],
        nr35: null,
        tnps: null,
        inspecao_e: null,
        revisita: null,
        os_dig: null,
        geo: null,
        ura: null,
        tec1: null,
        bds: null,
      };

      KEYS.forEach((key) => {
        entry[key] = metrics[key]?.valor ?? null;
      });

      return entry;
    });
  }, [data, isDateFiltered]);

  const indicatorAvgs = React.useMemo(
    () =>
      KEYS.map((key) => {
        const values = latestDataForMetrics
          .map((row) => row[key])
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        const normalizedAverage =
          values.length > 0 ? values.reduce((sum, value) => sum + normalizeScore(key, value), 0) / values.length : 0;
        const targetHits = values.filter((value) => atingeMeta(key, value)).length;

        return {
          key,
          indicador: INDICADOR_LABELS[key],
          media: Number(average.toFixed(1)),
          mediaNorm: Number(normalizedAverage.toFixed(1)),
          count: values.length,
          targetHits,
          pctMeta: values.length > 0 ? Number(((targetHits / values.length) * 100).toFixed(1)) : 0,
        };
      }),
    [latestDataForMetrics],
  );

  const technicianRows = React.useMemo(() => {
    const byTechnician = new Map<
      string,
      {
        login: string;
        tecnico: string;
        supervisor: string;
        scoreSum: number;
        readings: number;
        targetHits: number;
      }
    >();

    latestDataForMetrics.forEach((row) => {
      const current =
        byTechnician.get(row.login) ??
        {
          login: row.login,
          tecnico: row.tecnico,
          supervisor: row.supervisor,
          scoreSum: 0,
          readings: 0,
          targetHits: 0,
        };

      KEYS.forEach((key) => {
        const value = row[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) return;

        current.scoreSum += normalizeScore(key, value);
        current.readings += 1;
        if (atingeMeta(key, value)) current.targetHits += 1;
      });

      byTechnician.set(row.login, current);
    });

    return [...byTechnician.values()]
      .map((row) => {
        const media = row.readings > 0 ? row.scoreSum / row.readings : 0;
        const pctMeta = row.readings > 0 ? (row.targetHits / row.readings) * 100 : 0;
        const status = pctMeta >= 70 ? 'Na meta' : pctMeta >= 45 ? 'Atenção' : 'Crítico';

        return {
          ...row,
          media: Number(media.toFixed(1)),
          pctMeta: Number(pctMeta.toFixed(1)),
          status,
        };
      })
      .sort((a, b) => b.media - a.media);
  }, [latestDataForMetrics]);

  const supervisorRows = React.useMemo(() => {
    const bySupervisor = new Map<string, { supervisor: string; scoreSum: number; count: number; technicians: number }>();

    technicianRows.forEach((row) => {
      const current =
        bySupervisor.get(row.supervisor) ?? { supervisor: row.supervisor, scoreSum: 0, count: 0, technicians: 0 };
      current.scoreSum += row.media;
      current.count += 1;
      current.technicians += 1;
      bySupervisor.set(row.supervisor, current);
    });

    return [...bySupervisor.values()]
      .map((row) => ({
        supervisor: row.supervisor,
        media: row.count > 0 ? Number((row.scoreSum / row.count).toFixed(1)) : 0,
        technicians: row.technicians,
      }))
      .sort((a, b) => b.media - a.media);
  }, [technicianRows]);

  const timeSeries = React.useMemo(() => {
    const byDate = new Map<string, { date: string; scoreSum: number; readings: number; targetHits: number }>();

    data.forEach((row) => {
      const current = byDate.get(row.data_referencia) ?? {
        date: row.data_referencia,
        scoreSum: 0,
        readings: 0,
        targetHits: 0,
      };

      KEYS.forEach((key) => {
        const value = row[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) return;

        current.scoreSum += normalizeScore(key, value);
        current.readings += 1;
        if (atingeMeta(key, value)) current.targetHits += 1;
      });

      byDate.set(row.data_referencia, current);
    });

    return [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map((row) => ({
        dia: formatDate(row.date),
        media: row.readings > 0 ? Number((row.scoreSum / row.readings).toFixed(1)) : 0,
        naMeta: row.readings > 0 ? Number(((row.targetHits / row.readings) * 100).toFixed(1)) : 0,
      }));
  }, [data]);

  const indicatorDifficulty = React.useMemo(
    () =>
      indicatorAvgs
        .filter((indicator) => indicator.count > 0)
        .map((indicator) => {
          const foraMeta = indicator.count - indicator.targetHits;
          const pctForaMeta = indicator.count > 0 ? Number(((foraMeta / indicator.count) * 100).toFixed(1)) : 0;

          return {
            ...indicator,
            foraMeta,
            pctForaMeta,
          };
        })
        .sort((a, b) => b.pctForaMeta - a.pctForaMeta || b.foraMeta - a.foraMeta),
    [indicatorAvgs],
  );

  const technicians = new Set(latestDataForMetrics.map((row) => row.login));
  const supervisors = new Set(latestDataForMetrics.map((row) => row.supervisor));
  const activeIndicators = indicatorAvgs.filter((indicator) => indicator.count > 0).length;
  const inactiveIndicators = KEYS.length - activeIndicators;
  const totalReadings = indicatorAvgs.reduce((sum, indicator) => sum + indicator.count, 0);
  const targetReadings = latestDataForMetrics.reduce(
    (sum, row) =>
      sum +
      KEYS.reduce((metricSum, key) => {
        const value = row[key];
        return metricSum + (typeof value === 'number' && atingeMeta(key, value) ? 1 : 0);
      }, 0),
    0,
  );
  const mediaGeral =
    totalReadings > 0
      ? indicatorAvgs.reduce((sum, indicator) => sum + indicator.mediaNorm * indicator.count, 0) / totalReadings
      : 0;
  const pctNaMeta = totalReadings > 0 ? (targetReadings / totalReadings) * 100 : 0;

  const metaColor = pctNaMeta >= 70 ? 'success' : pctNaMeta >= 45 ? 'warning' : 'destructive';

  const emptyState = (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      Sem dados para o filtro atual.
    </div>
  );

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Visão Geral</h2>
        </div>
        <Badge variant="secondary" className="rounded-md">
          {cidade}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Técnicos"
          value={formatNumber(technicians.size)}
          subtitle={`${formatNumber(supervisors.size)} supervisores`}
          icon={Users}
          color="primary"
        />
        <KPICard
          title="Média geral"
          value={formatPercent(mediaGeral)}
          subtitle="score normalizado"
          icon={BarChart3}
          color="primary"
        />
        <KPICard
          title="% na meta"
          value={formatPercent(pctNaMeta)}
          subtitle={`${formatNumber(targetReadings)} de ${formatNumber(totalReadings)} leituras`}
          icon={CheckCircle2}
          trend={pctNaMeta >= 70 ? 'up' : pctNaMeta < 45 ? 'down' : 'neutral'}
          color={metaColor}
        />
        <KPICard
          title="Supervisores"
          value={formatNumber(supervisors.size)}
          subtitle="equipes ativas"
          icon={Target}
          color="warning"
        />
        <KPICard
          title="Indicadores analisados"
          value={`${activeIndicators}/${KEYS.length}`}
          subtitle="com dados no filtro"
          icon={ClipboardList}
          color="success"
        />
        <KPICard
          title="Sem dados"
          value={formatNumber(inactiveIndicators)}
          subtitle="indicadores sem dados"
          icon={AlertCircle}
          color={inactiveIndicators > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.95fr_1.1fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-semibold">Indicadores por dia</CardTitle>
            <Badge variant="secondary" className="rounded-md">
              Diário
            </Badge>
          </CardHeader>
          <CardContent className="h-[280px] px-2 sm:px-4">
            {timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeries} margin={{ left: -12, right: 0, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis yAxisId="right" domain={[0, 100]} hide />
                  <Tooltip
                    formatter={(value: number, name) => [
                      formatPercent(Number(value)),
                      name === 'media' ? 'Média' : '% na meta',
                    ]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar yAxisId="left" dataKey="media" fill="#2563eb" radius={[4, 4, 0, 0]} name="media" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="naMeta"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#dc2626' }}
                    name="% na meta"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              emptyState
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Dificuldade por indicador</CardTitle>
          </CardHeader>
          <CardContent>
            {indicatorDifficulty.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Técnicos fora da meta em cada indicador</p>
                <div className="space-y-2">
                  {indicatorDifficulty.map((indicator) => (
                    <div key={indicator.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-foreground">{indicator.indicador}</span>
                        <span className="shrink-0 font-semibold text-foreground">
                          {formatNumber(indicator.foraMeta)}/{formatNumber(indicator.count)} · {formatPercent(indicator.pctForaMeta)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: indicator.pctForaMeta > 0 ? `${Math.max(3, indicator.pctForaMeta)}%` : '0%' }}
                          aria-label={`${indicator.indicador}: ${indicator.foraMeta} de ${indicator.count} técnicos fora da meta`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              emptyState
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-semibold">Ranking de supervisores</CardTitle>
            <Badge variant="secondary" className="rounded-md">
              Top 5
            </Badge>
          </CardHeader>
          <CardContent>
            {supervisorRows.length > 0 ? (
              <div className="space-y-3">
                {supervisorRows.slice(0, 5).map((row, index) => (
                  <div key={row.supervisor} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-foreground">{row.supervisor}</p>
                        <span className="text-xs text-muted-foreground">{formatNumber(row.technicians)}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-success" style={{ width: `${clampPercent(row.media)}%` }} />
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">{formatPercent(row.media)}</span>
                  </div>
                ))}
              </div>
            ) : (
              emptyState
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-sm font-semibold">Indicadores detalhados</CardTitle>
          <Badge variant="secondary" className="rounded-md">
            {formatNumber(technicianRows.length)} técnicos
          </Badge>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-right">Média</TableHead>
                <TableHead className="text-right">Na meta</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicianRows.slice(0, 8).map((row, index) => (
                <TableRow key={row.login}>
                  <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{row.tecnico}</p>
                      <p className="text-xs text-muted-foreground">{row.login}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.supervisor}</TableCell>
                  <TableCell className="text-right font-semibold">{formatPercent(row.media)}</TableCell>
                  <TableCell className="text-right">{formatPercent(row.pctMeta)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === 'Crítico' ? 'destructive' : 'secondary'}
                      className={
                        row.status === 'Na meta'
                          ? 'border-transparent bg-success/10 text-success hover:bg-success/10'
                          : row.status === 'Atenção'
                            ? 'border-transparent bg-warning/10 text-warning hover:bg-warning/10'
                            : undefined
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {technicianRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Sem dados para o filtro atual.
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

export default ResumoTab;
