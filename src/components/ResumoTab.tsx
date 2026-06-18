import React from 'react';
import KPICard from '@/components/KPICard';
import RankingList from '@/components/RankingList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { BarChart3, Users, TrendingUp, Award } from 'lucide-react';
import type { IndicadorTecnico, IndicadorKey } from '@/types/database';
import { INDICADOR_LABELS } from '@/types/database';

interface ResumoTabProps {
  data: IndicadorTecnico[];
  cidade: string;
  isDateFiltered?: boolean;
}

const KEYS: IndicadorKey[] = ['nr35', 'tnps', 'inspecao_e', 'revisita', 'os_dig', 'geo', 'ura', 'tec1', 'bds'];

type MetricRow = Pick<IndicadorTecnico, 'login' | 'tecnico' | 'supervisor'> & Record<IndicadorKey, number | null>;

const ResumoTab: React.FC<ResumoTabProps> = ({ data, cidade, isDateFiltered = false }) => {
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
      KEYS.forEach((key) => {
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
      KEYS.forEach((key) => {
        entry[key] = keysObj[key] !== undefined ? keysObj[key].valor : null;
      });
      return entry;
    });
  }, [data, isDateFiltered]);

  const indicatorAvgs = KEYS.map((key) => {
    const vals = latestDataForMetrics.filter((d) => d[key] !== null).map((d) => d[key] as number);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    // Para REVISITA: inverter a escala (0% real = 100% radar, >=7% real = 0% radar)
    const mediaNormalizada = key === 'revisita'
      ? Number(Math.max(0, ((7 - avg) / 7) * 100).toFixed(1))
      : Number(avg.toFixed(1));
    return { indicador: INDICADOR_LABELS[key], media: Number(avg.toFixed(1)), mediaNorm: mediaNormalizada, key };
  });

  const tecnicos = new Set(latestDataForMetrics.map((d) => d.login));
  const supervisores = new Set(latestDataForMetrics.map((d) => d.supervisor));
  const mediaGeral = indicatorAvgs.length > 0 ? indicatorAvgs.reduce((a, b) => a + b.mediaNorm, 0) / indicatorAvgs.length : 0;

  const byTecnico: Record<string, { sum: number; count: number; nome: string }> = {};
  latestDataForMetrics.forEach((d) => {
    if (!byTecnico[d.login]) byTecnico[d.login] = { sum: 0, count: 0, nome: d.tecnico };
    KEYS.forEach((key) => {
      if (d[key] !== null) {
        byTecnico[d.login].sum += d[key] as number;
        byTecnico[d.login].count++;
      }
    });
  });
  const tecnicoRankings = Object.values(byTecnico)
    .map((t) => ({ nome: t.nome, valor: t.count > 0 ? t.sum / t.count : 0 }))
    .sort((a, b) => b.valor - a.valor);

  const top5 = tecnicoRankings.slice(0, 5);
  const bottom5 = [...tecnicoRankings].sort((a, b) => a.valor - b.valor).slice(0, 5);

  const radarData = indicatorAvgs.map((ia) => ({
    subject: ia.indicador,
    value: ia.mediaNorm,
    fullMark: 100,
  }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-base sm:text-lg font-display font-semibold text-foreground">
        <BarChart3 className="h-5 w-5 text-primary" />
        Visão Geral — {cidade}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Média Geral" value={`${mediaGeral.toFixed(1)}%`} icon={BarChart3} color="primary" />
        <KPICard title="Técnicos" value={String(tecnicos.size)} icon={Users} color="primary" />
        <KPICard title="Supervisores" value={String(supervisores.size)} icon={Users} color="warning" />
        <KPICard title="Indicadores" value={String(KEYS.length)} icon={Award} color="success" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Média por Indicador</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={indicatorAvgs} margin={{ left: 0, right: 10, top: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="indicador" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis domain={[0, 110]} tick={{ fontSize: 10 }} width={35} />
              <Tooltip />
              <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, offset: 5 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RankingList title="Top 5 Técnicos (Geral)" items={top5} type="best" />
        <RankingList title="Bottom 5 Técnicos (Geral)" items={bottom5} type="worst" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Radar de Indicadores</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Média" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumoTab;
