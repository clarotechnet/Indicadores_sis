import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useCity } from '@/contexts/CityContext';
import KPICard from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { CheckCircle, Loader2, Clock, XCircle, Users } from 'lucide-react';
import type { HorarioPrimeiroCliente } from '@/types/database';

interface HorarioEntrada {
  id: number;
  data: string;
  login_tecnico: string;
  hora_entrada: string;
  created_at: string;
}

interface ComparativoRow {
  data: string;
  login_tecnico: string;
  nome_tecnico: string;
  supervisor: string;
  cidade: string;
  hora_entrada: string;
  horario_primeiro_cliente: string;
  tempo_deslocamento: string;
  tempo_minutos: number;
  classificacao: 'IDEAL' | 'RUIM' | 'NEUTRO';
}

const timeToSeconds = (t: string): number => {
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
};

const secondsToTime = (s: number): string => {
  const abs = Math.abs(s);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const sec = abs % 60;
  const sign = s < 0 ? '-' : '';
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const minutosParaHorario = (minutos: number): string => {
  const h = Math.floor(minutos / 60);
  const m = Math.floor(minutos % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const classificarDeslocamento = (tempoMinutos: number): 'IDEAL' | 'RUIM' | 'NEUTRO' => {
  if (tempoMinutos < 0) return 'RUIM';
  if (tempoMinutos >= 40) return 'RUIM';
  if (tempoMinutos >= 30) return 'NEUTRO';
  return 'IDEAL';
};

const classDotColor = (c: string) => {
  if (c === 'IDEAL') return 'bg-success';
  if (c === 'RUIM') return 'bg-destructive';
  return 'bg-warning';
};

const formatDatePtBr = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

interface ComparativoHroTabProps {
  horarioData: HorarioPrimeiroCliente[];
}

const ComparativoHroTab: React.FC<ComparativoHroTabProps> = ({ horarioData }) => {
  const { selectedCity } = useCity();
  const [entradas, setEntradas] = useState<HorarioEntrada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntradas = async () => {
      if (!selectedCity) return;
      setLoading(true);
      const { data } = await supabase
        .from('horario_entrada_tecnico')
        .select('*')
        .eq('cidade', selectedCity)
        .order('data', { ascending: true })
        .order('login_tecnico', { ascending: true });
      setEntradas((data as HorarioEntrada[]) || []);
      setLoading(false);
    };
    fetchEntradas();
  }, [selectedCity]);

  const comparativo = useMemo<ComparativoRow[]>(() => {
    const rows: ComparativoRow[] = [];
    const entradaMap = new Map<string, HorarioEntrada>();
    entradas.forEach((e) => {
      entradaMap.set(`${e.login_tecnico.toUpperCase()}_${e.data}`, e);
    });

    horarioData.forEach((h) => {
      const key = `${h.login.toUpperCase()}_${h.data_referencia}`;
      const entrada = entradaMap.get(key);
      if (!entrada) return;

      const hpcSec = timeToSeconds(h.horario_primeiro_cliente);
      const heSec = timeToSeconds(entrada.hora_entrada);
      const diffSec = hpcSec - heSec;

      rows.push({
        data: h.data_referencia,
        login_tecnico: h.login,
        nome_tecnico: h.tecnico,
        supervisor: h.supervisor,
        cidade: h.cidade,
        hora_entrada: entrada.hora_entrada,
        horario_primeiro_cliente: h.horario_primeiro_cliente,
        tempo_deslocamento: secondsToTime(diffSec),
        tempo_minutos: diffSec / 60,
        classificacao: classificarDeslocamento(diffSec / 60),
      });
    });

    return rows.sort((a, b) => b.data.localeCompare(a.data) || a.nome_tecnico.localeCompare(b.nome_tecnico));
  }, [horarioData, entradas]);

  // Deduplicate by login: keep latest record per login
  const latestByLogin = useMemo(() => {
    const map = new Map<string, ComparativoRow>();
    comparativo.forEach((r) => {
      const existing = map.get(r.login_tecnico);
      if (!existing || r.data > existing.data) {
        map.set(r.login_tecnico, r);
      }
    });
    return Array.from(map.values());
  }, [comparativo]);

  const ideal = latestByLogin.filter((r) => r.classificacao === 'IDEAL');
  const neutro = latestByLogin.filter((r) => r.classificacao === 'NEUTRO');
  const ruim = latestByLogin.filter((r) => r.classificacao === 'RUIM');
  const total = latestByLogin.length;
  const pctIdeal = total > 0 ? (ideal.length / total) * 100 : 0;
  const pctNeutro = total > 0 ? (neutro.length / total) * 100 : 0;
  const pctRuim = total > 0 ? (ruim.length / total) * 100 : 0;

  // Rankings by hora_entrada (minutes from midnight)
  const horarioParaMinutos = (horario: string): number => {
    const [h, m, s] = horario.split(':').map(Number);
    return h * 60 + m + (s || 0) / 60;
  };

  const rankings = latestByLogin
    .map((r) => ({
      nome: r.nome_tecnico,
      valor: horarioParaMinutos(r.hora_entrada),
      display: r.hora_entrada.substring(0, 5),
    }))
    .sort((a, b) => a.valor - b.valor);

  const top5 = rankings.slice(0, 5);
  const bottom5 = [...rankings].sort((a, b) => b.valor - a.valor).slice(0, 5);

  // Evolution by date
  const byDate: Record<string, { ideal: number; total: number }> = {};
  comparativo.forEach((r) => {
    if (!byDate[r.data]) byDate[r.data] = { ideal: 0, total: 0 };
    byDate[r.data].total++;
    if (r.classificacao === 'IDEAL') byDate[r.data].ideal++;
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
    { name: 'Neutro', value: neutro.length },
    { name: 'Ruim', value: ruim.length },
  ];
  const pieColors = ['hsl(142, 71%, 45%)', 'hsl(var(--warning))', 'hsl(0, 84%, 60%)'];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard title="Tempo Ideal" value={String(ideal.length)} subtitle={`${pctIdeal.toFixed(1)}%`} icon={CheckCircle} color="success" />
        <KPICard title="Tempo Neutro" value={String(neutro.length)} subtitle={`${pctNeutro.toFixed(1)}%`} icon={Clock} color="warning" />
        <KPICard title="Tempo Ruim" value={String(ruim.length)} subtitle={`${pctRuim.toFixed(1)}%`} icon={XCircle} color="destructive" />
        <KPICard title="% Ideal" value={`${pctIdeal.toFixed(1)}%`} icon={Clock} color="success" />
        <KPICard title="Avaliados" value={String(total)} icon={Users} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RankingListComparativo title="Top 5 - Mais Cedo" items={top5} type="best" />
        <RankingListComparativo title="Bottom 5 - Mais Tarde" items={bottom5} type="worst" />
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

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Dados Detalhados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : comparativo.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado encontrado. Importe os horários de entrada para gerar o comparativo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Login</TableHead>
                  <TableHead className="text-xs">Técnico</TableHead>
                  <TableHead className="text-xs">Supervisor</TableHead>
                  <TableHead className="text-xs">Hora Entrada</TableHead>
                  <TableHead className="text-xs">1º Cliente</TableHead>
                  <TableHead className="text-xs">Deslocamento</TableHead>
                  <TableHead className="text-xs">Classificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparativo.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{formatDatePtBr(r.data)}</TableCell>
                    <TableCell className="text-xs font-mono">{r.login_tecnico}</TableCell>
                    <TableCell className="text-xs">{r.nome_tecnico}</TableCell>
                    <TableCell className="text-xs">{r.supervisor}</TableCell>
                    <TableCell className="text-xs">{r.hora_entrada}</TableCell>
                    <TableCell className="text-xs">{r.horario_primeiro_cliente}</TableCell>
                    <TableCell className="text-xs font-semibold">{r.tempo_deslocamento}</TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-block w-3 h-3 rounded-full ${classDotColor(r.classificacao)}`} title={r.classificacao} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Ranking component matching HorarioTab style
interface RankingComparativoItem {
  nome: string;
  valor: number;
  display: string;
}

interface RankingListComparativoProps {
  title: string;
  items: RankingComparativoItem[];
  type: 'best' | 'worst';
}

const RankingListComparativo: React.FC<RankingListComparativoProps> = ({ title, items, type }) => {
  const Icon = type === 'best' ? CheckCircle : XCircle;
  const iconColor = type === 'best' ? 'text-success' : 'text-destructive';

  const minMinutos = 460;
  const maxMinutos = 510;

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

export default ComparativoHroTab;
