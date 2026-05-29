import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Users, Route, ClipboardCheck } from 'lucide-react';
import KPICard from '@/components/KPICard';
import type { KmTecnica } from '@/types/database';

interface KmChartsTabProps {
  data: KmTecnica[];
  transporteMap: Map<string, string>;
}

const KmChartsTab: React.FC<KmChartsTabProps> = ({ data, transporteMap }) => {
  const totalKm = useMemo(() => data.reduce((s, d) => s + (d.distancia_km || 0), 0), [data]);
  const totalOS = data.length;
  const mediaKmOS = totalOS > 0 ? totalKm / totalOS : 0;
  const totalTecnicos = useMemo(() => new Set(data.map(d => d.login_tecnico)).size, [data]);

  // Top 10 by KM
  const rankingKm = useMemo(() => {
    const map = new Map<string, { nome: string; km: number; os: number }>();
    data.forEach(d => {
      const existing = map.get(d.login_tecnico) || { nome: d.recurso, km: 0, os: 0 };
      existing.km += d.distancia_km || 0;
      existing.os += 1;
      map.set(d.login_tecnico, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.km - a.km)
      .slice(0, 10)
      .map(d => ({ nome: d.nome.length > 15 ? d.nome.substring(0, 15) + '...' : d.nome, km: Math.round(d.km * 10) / 10, os: d.os }));
  }, [data]);

  // KM por técnico (all)
  const kmPorTecnico = useMemo(() => {
    const map = new Map<string, { nome: string; km: number }>();
    data.forEach(d => {
      const existing = map.get(d.login_tecnico) || { nome: d.recurso, km: 0 };
      existing.km += d.distancia_km || 0;
      map.set(d.login_tecnico, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.km - a.km)
      .slice(0, 20)
      .map(d => ({ nome: d.nome.length > 12 ? d.nome.substring(0, 12) + '...' : d.nome, km: Math.round(d.km * 10) / 10 }));
  }, [data]);

  // Evolução KM por data
  const evolucaoKm = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(d => {
      map.set(d.data, (map.get(d.data) || 0) + (d.distancia_km || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, km]) => ({
        data: data.split('-').reverse().slice(0, 2).join('/'),
        km: Math.round(km * 10) / 10,
      }));
  }, [data]);

  // OS por frente
  const osPorFrente = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(d => {
      const frente = d.frente || 'SEM FRENTE';
      map.set(frente, (map.get(frente) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([frente, count]) => ({ frente: frente.length > 15 ? frente.substring(0, 15) + '...' : frente, os: count }));
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total KM" value={`${totalKm.toFixed(1)} km`} icon={Route} color="primary" />
        <KPICard title="OS Concluídas" value={String(totalOS)} icon={ClipboardCheck} color="success" />
        <KPICard title="Média KM/OS" value={`${mediaKmOS.toFixed(1)} km`} icon={TrendingUp} color="warning" />
        <KPICard title="Total Técnicos" value={String(totalTecnicos)} icon={Users} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 KM */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 - KM Percorrido</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingKm} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} km`, 'KM']} />
                <Bar dataKey="km" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* KM por Técnico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">KM por Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kmPorTecnico} margin={{ left: 5, right: 10, top: 5, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="nome" angle={0} textAnchor="end" tick={{ fontSize: 11 }} height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} km`, 'KM']} />
                <Bar dataKey="km" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução KM */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução de KM ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucaoKm} margin={{ left: 5, right: 10, top: 5, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="data" angle={0} textAnchor="end" tick={{ fontSize: 10 }} height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} km`, 'KM']} />
                <Line type="monotone" dataKey="km" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* OS por Frente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">OS por Frente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={osPorFrente} margin={{ left: 5, right: 10, top: 5, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="frente" angle={0} textAnchor="end" tick={{ fontSize: 9 }} height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="os" name="OS" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KmChartsTab;