import React from 'react';
import KPICard from '@/components/KPICard';
import RankingList from '@/components/RankingList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import type { HorarioPrimeiroCliente } from '@/types/database';

interface HorarioTabProps {
  data: HorarioPrimeiroCliente[];
  isDateFiltered?: boolean;
}

const horarioParaMinutos = (horario: string): number => {
  const [h, m, s] = horario.split(':').map(Number);
  return h * 60 + m + s / 60;
};

const minutosParaHorario = (minutos: number): string => {
  const h = Math.floor(minutos / 60);
  const m = Math.floor(minutos % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const HorarioTab: React.FC<HorarioTabProps> = ({ data, isDateFiltered = false }) => {
  // Deduplicate by login: keep only the latest record per login
  const latestByLogin = new Map<string, HorarioPrimeiroCliente>();
  data.forEach((d) => {
    const existing = latestByLogin.get(d.login);
    if (!existing || d.data_referencia > existing.data_referencia) {
      latestByLogin.set(d.login, d);
    }
  });
  const uniqueData = Array.from(latestByLogin.values());

  const ideal = uniqueData.filter((d) => d.classificacao_horario === 'ideal');
  const ruim = uniqueData.filter((d) => d.classificacao_horario === 'ruim');
  const totalRecords = uniqueData.length;
  const pctIdeal = totalRecords > 0 ? (ideal.length / totalRecords) * 100 : 0;
  const pctRuim = totalRecords > 0 ? (ruim.length / totalRecords) * 100 : 0;

  const byTecnico: Record<string, { minutos: number; nome: string }> = {};
  uniqueData.forEach((d) => {
    byTecnico[d.login] = { minutos: horarioParaMinutos(d.horario_primeiro_cliente), nome: d.tecnico };
  });

  const rankings = Object.values(byTecnico)
    .map((t) => ({ 
      nome: t.nome, 
      valor: t.minutos,
      display: minutosParaHorario(t.minutos)
    }))
    .sort((a, b) => a.valor - b.valor);

  const top5 = rankings.slice(0, 5);
  const bottom5 = [...rankings].sort((a, b) => b.valor - a.valor).slice(0, 5);

  const byDate: Record<string, { ideal: number; total: number }> = {};
  data.forEach((d) => {
    if (!byDate[d.data_referencia]) byDate[d.data_referencia] = { ideal: 0, total: 0 };
    byDate[d.data_referencia].total++;
    if (d.classificacao_horario === 'ideal') byDate[d.data_referencia].ideal++;
  });
  const lineData = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => {
    const [y, m, d] = date.split('-');
    return {
      data: `${d}-${m}-${y}`,
      '% Ideal': Number(((v.ideal / v.total) * 100).toFixed(1)),
    };
  });

  const pieData = [
    { name: 'Ideal', value: ideal.length },
    { name: 'Ruim', value: ruim.length },
  ];
  const pieColors = ['hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Tempo Ideal" value={String(ideal.length)} subtitle={`${pctIdeal.toFixed(1)}%`} icon={CheckCircle} color="success" />
        <KPICard title="Tempo Ruim" value={String(ruim.length)} subtitle={`${pctRuim.toFixed(1)}%`} icon={XCircle} color="destructive" />
        <KPICard title="% Ideal" value={`${pctIdeal.toFixed(1)}%`} icon={Clock} color="success" />
        <KPICard title="Avaliados" value={String(rankings.length)} icon={Users} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RankingListHorario title="Top 5 - Mais Cedo" items={top5} type="best" />
        <RankingListHorario title="Bottom 5 - Mais Tarde" items={bottom5} type="worst" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição de Horários</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução % Ideal por Dia</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="% Ideal" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface RankingHorarioItem {
  nome: string;
  valor: number;
  display: string;
}

interface RankingListHorarioProps {
  title: string;
  items: RankingHorarioItem[];
  type: 'best' | 'worst';
}

const RankingListHorario: React.FC<RankingListHorarioProps> = ({ title, items, type }) => {
  const Icon = type === 'best' ? CheckCircle : XCircle;
  const iconColor = type === 'best' ? 'text-success' : 'text-destructive';

  const minMinutos = 470;
  const maxMinutos = 500;

  const getBarWidth = (valor: number) => {
    const normalized = ((valor - minMinutos) / (maxMinutos - minMinutos)) * 100;
    return Math.max(5, Math.min(100, normalized));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3">
              <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                type === 'best' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm truncate text-foreground">{item.nome}</span>
                  <span className={`text-xs sm:text-sm font-semibold shrink-0 ${
                    type === 'best' ? 'text-success' : 'text-destructive'
                  }`}>
                    {item.display}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      type === 'best' ? 'bg-success' : 'bg-destructive'
                    }`}
                    style={{ width: `${type === 'best' ? 100 - getBarWidth(item.valor) : getBarWidth(item.valor)}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default HorarioTab;