import React from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock, ClipboardList, Target, XCircle } from 'lucide-react';

import KPICard from '@/components/KPICard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HorarioPrimeiroCliente, IndicadorKey, IndicadorTecnico } from '@/types/database';
import { INDICADOR_LABELS, INDICADOR_METAS, atingeMeta } from '@/types/database';

interface TecnicoOverviewProps {
  data: IndicadorTecnico[];
  horarioData: HorarioPrimeiroCliente[];
  cidade: string;
}

type IndicatorResult = {
  key: IndicadorKey;
  label: string;
  value: number | null;
  count: number;
  subtitle: string;
  metaLabel: string;
  inTarget: boolean | null;
  score: number;
};

const TECH_INDICATOR_KEYS: IndicadorKey[] = ['nr35', 'tnps', 'inspecao_e', 'revisita', 'os_dig', 'ura', 'tec1', 'bds'];

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

const formatPercent = (value: number) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const timeToMinutes = (value: string) => {
  const [hour = '0', minute = '0', second = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute) + Number(second) / 60;
};

const minutesToTime = (value: number) => {
  const totalMinutes = Math.round(value);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const HORARIO_IDEAL_START_MINUTES = 7 * 60 + 50;
const HORARIO_IDEAL_END_MINUTES = 8 * 60 + 15;

const scoreValue = (key: IndicadorKey, value: number) => {
  const meta = INDICADOR_METAS[key];

  if (meta.tipo === 'menor') {
    return clampPercent(((meta.valor - value) / meta.valor) * 100);
  }

  return clampPercent(value);
};

const metaLabel = (key: IndicadorKey) => {
  const meta = INDICADOR_METAS[key];
  return `Meta ${meta.tipo === 'maior' ? '>=' : '<='} ${formatPercent(meta.valor)}`;
};

const latestRowForKey = (rows: IndicadorTecnico[], key: IndicadorKey) =>
  rows.reduce<IndicadorTecnico | null>((latest, row) => {
    const value = row[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return latest;
    if (!latest || row.data_referencia > latest.data_referencia) return row;
    return latest;
  }, null);

const TecnicoOverview: React.FC<TecnicoOverviewProps> = ({
  data,
  horarioData,
  cidade,
}) => {
  const tecnico = data[0]?.tecnico ?? horarioData[0]?.tecnico ?? 'Tecnico';

  const indicatorResults = React.useMemo<IndicatorResult[]>(
    () =>
      TECH_INDICATOR_KEYS.map((key) => {
        const latest = latestRowForKey(data, key);

        if (!latest) {
          return {
            key,
            label: INDICADOR_LABELS[key],
            value: null,
            count: 0,
            subtitle: 'Sem dados no filtro',
            metaLabel: metaLabel(key),
            inTarget: null,
            score: 0,
          };
        }

        const value = latest[key] as number;

        return {
          key,
          label: INDICADOR_LABELS[key],
          value,
          count: 1,
          subtitle: `Atualizado em ${formatDate(latest.data_referencia)}`,
          metaLabel: metaLabel(key),
          inTarget: atingeMeta(key, value),
          score: scoreValue(key, value),
        };
      }),
    [data],
  );

  const horarioStats = React.useMemo(() => {
    const latest = horarioData.reduce<HorarioPrimeiroCliente | null>((current, row) => {
      if (!current || row.data_referencia > current.data_referencia) return row;
      return current;
    }, null);
    const rowsForStats = horarioData;
    const ideal = rowsForStats.filter((row) => row.classificacao_horario === 'ideal').length;
    const total = rowsForStats.length;
    const pctIdeal = total > 0 ? (ideal / total) * 100 : 0;
    const averageMinutes =
      total > 0
        ? rowsForStats.reduce((sum, row) => sum + timeToMinutes(row.horario_primeiro_cliente), 0) / total
        : null;
    const averageIsIdeal =
      averageMinutes !== null &&
      averageMinutes >= HORARIO_IDEAL_START_MINUTES &&
      averageMinutes <= HORARIO_IDEAL_END_MINUTES;

    return {
      latest,
      total,
      ideal,
      pctIdeal,
      averageTime: averageMinutes !== null ? minutesToTime(averageMinutes) : null,
      averageIsIdeal,
      latestIsIdeal: latest?.classificacao_horario === 'ideal',
    };
  }, [horarioData]);

  const indicatorsWithData = indicatorResults.filter((item) => item.value !== null);
  const indicatorsOnTarget = indicatorsWithData.filter((item) => item.inTarget).length;
  const averageScore =
    indicatorsWithData.length > 0
      ? indicatorsWithData.reduce((sum, item) => sum + item.score, 0) / indicatorsWithData.length
      : 0;
  const totalReadings =
    indicatorResults.reduce((sum, item) => sum + item.count, 0) + horarioStats.total;
  const latestDate = [...data.map((row) => row.data_referencia), ...horarioData.map((row) => row.data_referencia)]
    .sort((a, b) => b.localeCompare(a))[0];
  const hasHorarioData = horarioStats.total > 0;

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Minha visão geral</h2>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{tecnico}</p>
        </div>
        <Badge variant="secondary" className="rounded-md">
          {cidade}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          title="Na meta"
          value={`${indicatorsOnTarget}/${indicatorsWithData.length || TECH_INDICATOR_KEYS.length}`}
          subtitle="indicadores com dados"
          icon={Target}
          color={indicatorsOnTarget === indicatorsWithData.length && indicatorsWithData.length > 0 ? 'success' : 'warning'}
        />
        <KPICard
          title="Média geral"
          value={formatPercent(averageScore)}
          subtitle="score dos indicadores"
          icon={BarChart3}
          color={averageScore >= 70 ? 'success' : averageScore >= 45 ? 'warning' : 'destructive'}
        />
        <KPICard
          title="Horário ideal"
          value={formatPercent(horarioStats.pctIdeal)}
          subtitle={`${horarioStats.ideal} de ${horarioStats.total || 0} registros`}
          icon={Clock}
          color={!hasHorarioData ? 'primary' : horarioStats.pctIdeal >= 70 ? 'success' : horarioStats.pctIdeal > 0 ? 'warning' : 'destructive'}
        />
        <KPICard
          title="Leituras"
          value={totalReadings.toLocaleString('pt-BR')}
          subtitle={latestDate ? `Última em ${formatDate(latestDate)}` : 'Sem dados'}
          icon={ClipboardList}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {indicatorResults.map((indicator) => (
          <Card key={indicator.key} className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="min-w-0">
                <CardTitle className="truncate text-sm font-semibold">{indicator.label}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{indicator.metaLabel}</p>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  'shrink-0 border-transparent',
                  indicator.inTarget === true && 'bg-success/10 text-success hover:bg-success/10',
                  indicator.inTarget === false && 'bg-destructive/10 text-destructive hover:bg-destructive/10',
                )}
              >
                {indicator.inTarget === null ? 'Sem dados' : indicator.inTarget ? 'Na meta' : 'Fora'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <p className="font-display text-3xl font-bold text-foreground">
                  {indicator.value === null ? '--' : formatPercent(indicator.value)}
                </p>
                {indicator.inTarget === false ? (
                  <XCircle className="mb-1 size-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="mb-1 size-5 text-success" />
                )}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', indicator.inTarget === false ? 'bg-destructive' : 'bg-success')}
                  style={{ width: indicator.value === null ? '0%' : `${Math.max(4, indicator.score)}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{indicator.subtitle}</p>
            </CardContent>
          </Card>
        ))}

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold">Horário</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Média do primeiro cliente</p>
              <p className="mt-1 text-xs text-muted-foreground">Horário ideal (07:50..08:15)</p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                'shrink-0 border-transparent',
                !hasHorarioData && 'bg-muted text-muted-foreground hover:bg-muted',
                hasHorarioData &&
                (horarioStats.averageIsIdeal
                  ? 'bg-success/10 text-success hover:bg-success/10'
                  : 'bg-destructive/10 text-destructive hover:bg-destructive/10'),
              )}
            >
              {hasHorarioData ? (horarioStats.averageIsIdeal ? 'Média ideal' : 'Média fora') : 'Sem dados'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <p className="font-display text-3xl font-bold text-foreground">
                {horarioStats.averageTime ?? '--:--'}
              </p>
              <Clock
                className={cn(
                  'mb-1 size-5',
                  !hasHorarioData && 'text-muted-foreground',
                  hasHorarioData && (horarioStats.averageIsIdeal ? 'text-success' : 'text-destructive'),
                )}
              />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: hasHorarioData ? `${Math.max(4, horarioStats.pctIdeal)}%` : '0%' }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {horarioStats.total > 0
                ? `${formatPercent(horarioStats.pctIdeal)} ideal em ${horarioStats.total.toLocaleString('pt-BR')} registros`
                : 'Sem dados no filtro'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-primary" />
            Leitura usada no resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cada indicador mostra o último resultado disponível no período. Horário mostra a média dos registros do período.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TecnicoOverview;
