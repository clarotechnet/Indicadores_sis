import React from 'react';
import KPICard from '@/components/KPICard';
import RankingList from '@/components/RankingList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Users, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { IndicadorTecnico, IndicadorKey, INDICADOR_LABELS } from '@/types/database';

interface SupervisorTabProps {
  data: IndicadorTecnico[];
  isDateFiltered?: boolean;
}

const INDICATOR_KEYS: IndicadorKey[] = ['nr35', 'tnps', 'inspecao_e', 'revisita', 'os_dig', 'geo', 'ura', 'tec1', 'bds'];

type MetricRow = Pick<IndicadorTecnico, 'login' | 'tecnico' | 'supervisor'> & Record<IndicadorKey, number | null>;
type SupervisorLineRow = { data: string } & Record<string, string | number | null>;

const SupervisorTab: React.FC<SupervisorTabProps> = ({ data, isDateFiltered = false }) => {
  const latestDataForMetrics = React.useMemo(() => {
    if (isDateFiltered) return data as MetricRow[];

    const tecnicoNames: Record<string, string> = {};
    const tecnicoSupervisores: Record<string, string> = {};
    const latestRecordByKey: Record<string, Record<string, { valor: number; data: string }>> = {};

    data.forEach((d) => {
      tecnicoNames[d.login] = d.tecnico;
      tecnicoSupervisores[d.login] = d.supervisor;
      if (!latestRecordByKey[d.login]) {
        latestRecordByKey[d.login] = {};
      }
      INDICATOR_KEYS.forEach((key) => {
        if (d[key] !== null) {
          const existing = latestRecordByKey[d.login][key];
          if (!existing || d.data_referencia > existing.data) {
            latestRecordByKey[d.login][key] = { valor: d[key] as number, data: d.data_referencia };
          }
        }
      });
    });

    return Object.entries(latestRecordByKey).map(([login, keysObj]) => {
      const entry: MetricRow = {
        login,
        tecnico: tecnicoNames[login],
        supervisor: tecnicoSupervisores[login],
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
      INDICATOR_KEYS.forEach((key) => {
        entry[key] = keysObj[key] !== undefined ? keysObj[key].valor : null;
      });
      return entry;
    });
  }, [data, isDateFiltered]);

  const bySupervisor: Record<string, { sums: Record<string, number>; counts: Record<string, number> }> = {};

  latestDataForMetrics.forEach((d) => {
    if (!bySupervisor[d.supervisor]) {
      bySupervisor[d.supervisor] = { sums: {}, counts: {} };
    }
    INDICATOR_KEYS.forEach((key) => {
      if (d[key] !== null) {
        bySupervisor[d.supervisor].sums[key] = (bySupervisor[d.supervisor].sums[key] || 0) + (d[key] as number);
        bySupervisor[d.supervisor].counts[key] = (bySupervisor[d.supervisor].counts[key] || 0) + 1;
      }
    });
  });

  const supervisorAvgs = Object.entries(bySupervisor).map(([nome, { sums, counts }]) => {
    const avgs = INDICATOR_KEYS
      .map((key) => counts[key] ? sums[key] / counts[key] : null)
      .filter((value): value is number => value !== null);
    const mediaGeral = avgs.length > 0 ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    return { nome, valor: mediaGeral };
  }).sort((a, b) => b.valor - a.valor);

  const top5 = supervisorAvgs.slice(0, 5);
  const bottom5 = [...supervisorAvgs].sort((a, b) => a.valor - b.valor).slice(0, 5);
  const mediaGeral = supervisorAvgs.length > 0 ? supervisorAvgs.reduce((a, b) => a + b.valor, 0) / supervisorAvgs.length : 0;

  const topSupervisors = top5.map(s => s.nome);
  
  const byDateSup: Record<string, Record<string, { sum: number; count: number }>> = {};
  data.forEach((d) => {
    if (!topSupervisors.includes(d.supervisor)) return;
    if (!byDateSup[d.data_referencia]) byDateSup[d.data_referencia] = {};
    if (!byDateSup[d.data_referencia][d.supervisor]) byDateSup[d.data_referencia][d.supervisor] = { sum: 0, count: 0 };
    INDICATOR_KEYS.forEach((key) => {
      if (d[key] !== null) {
        byDateSup[d.data_referencia][d.supervisor].sum += d[key] as number;
        byDateSup[d.data_referencia][d.supervisor].count += 1;
      }
    });
  });

  const lineData = Object.entries(byDateSup)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, sups]) => {
    const entry: SupervisorLineRow = {
      data: new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    };

    topSupervisors.forEach((s) => {
      entry[s] = sups[s]
        ? Number((sups[s].sum / sups[s].count).toFixed(1))
        : null;
    });

    return entry;
  });


 

  const colors = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(220, 70%, 50%)', 'hsl(280, 60%, 50%)'];

  const barData = supervisorAvgs.slice(0, 10).map((s) => ({
    name: s.nome.length > 12 ? s.nome.substring(0, 12) + '...' : s.nome,
    valor: Number(s.valor.toFixed(1)),
  }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Média Geral" value={`${mediaGeral.toFixed(1)}%`} icon={BarChart3} color="primary" />
        <KPICard title="Supervisores" value={String(supervisorAvgs.length)} icon={Users} color="primary" />
        <KPICard title="Melhor Média" value={top5[0]?.nome || '-'} subtitle={top5[0] ? `${top5[0].valor.toFixed(1)}%` : ''} icon={TrendingUp} color="success" />
        <KPICard title="Menor Média" value={bottom5[0]?.nome || '-'} subtitle={bottom5[0] ? `${bottom5[0].valor.toFixed(1)}%` : ''} icon={TrendingDown} color="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RankingList title="Top 5 Supervisores" items={top5} type="best" />
        <RankingList title="Bottom 5 Supervisores" items={bottom5} type="worst" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ranking por Supervisor</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução por Supervisor</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {topSupervisors.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={colors[i]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorTab;
