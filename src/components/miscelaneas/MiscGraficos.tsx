import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ExcessoMiscelanea } from '@/pages/ExcessoMiscelaneas';


interface Props {
  data: ExcessoMiscelanea[];
}

const formatPercent = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: value >= 10 ? 0 : 1,
    maximumFractionDigits: 1,
  });

const getPieColor = (index: number) => {
  const semanticColors = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))',
  ];

  return semanticColors[index] ?? `hsl(${(index * 37 + 18) % 360} 74% 54%)`;
};

const MiscGraficos: React.FC<Props> = ({ data }) => {
  // Daily production
  const dailyData = useMemo(() => {
   const dayMap = new Map<string, { count: number; tecMap: Map<string, number> }>();
    const tecnicoPeriodoMap = new Map<string, number>();

    data.forEach((d) => {
      const date = d.data_execucao;
      const tecnico = d.tecnico?.trim() || 'Sem técnico';

      if (!dayMap.has(date)) {
        dayMap.set(date, { count: 0, tecMap: new Map() });
      }
      const entry = dayMap.get(date)!;
      entry.count += 1;
      entry.tecMap.set(tecnico, (entry.tecMap.get(tecnico) || 0) + 1);
      tecnicoPeriodoMap.set(tecnico, (tecnicoPeriodoMap.get(tecnico) || 0) + 1);
    });
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, { count, tecMap }]) => {
        let topTecnico = 'Sem técnico';
        let topCount = 0;
         tecMap.forEach((currentCount, tecnico) => {
          if (currentCount > topCount) {
            topCount = currentCount;
            topTecnico = tecnico;
          }
        });
        return {
          data: new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          contagem: count,
           topTecnico,
          topCount,
          topPeriodoCount: tecnicoPeriodoMap.get(topTecnico) || 0,
        };
      });
  }, [data]);

  const totalPeriodo = useMemo(() => data.length, [data]);

   const topOfensor = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      const tec = d.tecnico?.trim() || 'Sem técnico';
      map.set(tec, (map.get(tec) || 0) + 1);
    });
    let best = { nome: '—', total: 0 };
    map.forEach((count, nome) => {
      if (count > best.total) best = { nome, total: count };
    });
    return best;
  }, [data]);

  const equipamentoData = useMemo(() => {
    const map = new Map<string, number>();
     data.forEach((d) => {
      const equipamento = d.equipamento?.trim() || 'Sem equipamento';
      map.set(equipamento, (map.get(equipamento) || 0) + 1);
    });
    const total = [...map.values()].reduce((sum, value) => sum + value, 0);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
        pctLabel: `${formatPercent(total > 0 ? (value / total) * 100 : 0)}%`,
        color: getPieColor(index),
      }));
  }, [data]);

    const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    return (
      <div className="max-w-[320px] space-y-2 rounded-xl border border-border bg-card p-3 text-sm shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">
          Ocorrências no dia: <span className="font-semibold text-foreground">{item.contagem}</span>
        </p>
       <p className="break-words font-semibold leading-snug text-primary">{item.topTecnico}</p>
        <p className="text-muted-foreground">
           No dia: <span className="font-semibold text-foreground">{item.topCount}</span>
          {' · '}No período: <span className="font-semibold text-foreground">{item.topPeriodoCount}</span>
        </p>
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="max-w-[320px] space-y-1 rounded-xl border border-border bg-card p-3 text-sm shadow-lg">
        <p className="break-words font-semibold leading-snug text-foreground">{item.name}</p>
        <p className="text-muted-foreground">
          Ocorrências: <span className="font-semibold text-foreground">{item.value}</span>
        </p>
        <p className="text-muted-foreground">
          Participação: <span className="font-semibold text-foreground">{item.pctLabel}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      <Card>
        <CardHeader>
         <CardTitle className="text-base">Produção Diária de Excessos</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
             <div className="h-[320px] sm:h-[380px] lg:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 16, right: 8, left: -8, bottom: 24 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    angle={-30}
                    textAnchor="end"
                    height={64}
                    tickMargin={8}
                    minTickGap={20}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={44}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.18 }} />
                  <Bar
                    dataKey="contagem"
                    name="Ocorrências do dia"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={72}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem dados.</p>
          )}
        </CardContent>
      </Card>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total no Período</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[130px] flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold text-primary">{totalPeriodo}</span>
            <span className="mt-2 text-sm text-muted-foreground">registros de excesso</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Ofensor</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[130px] flex-col items-center justify-center text-center">
            <span className="font-display text-4xl font-bold text-destructive">{topOfensor.total}</span>
            <p className="mt-2 max-w-[220px] truncate text-sm font-medium text-foreground" title={topOfensor.nome}>
              {topOfensor.nome}
            </p>
            <span className="text-xs text-muted-foreground">total de excessos no período</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipamentos Mais Recorrentes</CardTitle>
        </CardHeader>
        <CardContent>
          {equipamentoData.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-center">
              <div className="h-[320px] sm:h-[380px] lg:h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={equipamentoData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="54%"
                      paddingAngle={2}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      label={false}
                    >
                      {equipamentoData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Equipamento</span>
                  <span>Ocorrências</span>
                </div>

                <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 lg:max-h-[420px]">
                  {equipamentoData.map((item) => (
                    <div
                      key={item.name}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />

                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium leading-snug text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.pctLabel} do período</p>
                      </div>

                      <span className="whitespace-nowrap text-sm font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem dados.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default MiscGraficos;