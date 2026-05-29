import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database } from 'lucide-react';
import type { KmTecnica } from '@/types/database';

interface KmDataTabProps {
  data: KmTecnica[];
  transporteMap: Map<string, string>;
}

interface TecnicoResumo {
  login: string;
  nome: string;
  kmTotal: number;
  osTotal: number;
  kmPorOs: number;
  pontosGps: number;
  transporte: string;
  litros: number;
}

const KmDataTab: React.FC<KmDataTabProps> = ({ data, transporteMap }) => {
  const resumo = useMemo(() => {
    const map = new Map<string, TecnicoResumo>();
    data.forEach(d => {
      const existing = map.get(d.login_tecnico) || {
        login: d.login_tecnico,
        nome: d.recurso,
        kmTotal: 0,
        osTotal: 0,
        kmPorOs: 0,
        pontosGps: 0,
        transporte: '',
        litros: 0,
      };
      existing.kmTotal += d.distancia_km || 0;
      existing.osTotal += 1;
      if (d.endereco_destino) existing.pontosGps += 1;
      map.set(d.login_tecnico, existing);
    });
    return Array.from(map.values())
         .map(t => {
        const tipo = transporteMap.get(t.login.toUpperCase()) || 'carro';
        const kmPorLitro = tipo === 'moto' ? 30 : 10;
        return {
          ...t,
          kmPorOs: t.osTotal > 0 ? t.kmTotal / t.osTotal : 0,
          transporte: tipo,
          litros: t.kmTotal / kmPorLitro,
        };
      })
      .sort((a, b) => b.kmTotal - a.kmTotal);
}, [data, transporteMap]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Dados Detalhados
          <span className="text-xs text-muted-foreground ml-auto">{resumo.length} técnicos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Técnico</TableHead>
              <TableHead className="text-xs text-center">Transporte</TableHead>
              <TableHead className="text-xs text-right">KM Total</TableHead>
              <TableHead className="text-xs text-right">Litros Est.</TableHead>
              <TableHead className="text-xs text-right">OS</TableHead>
              <TableHead className="text-xs text-right">KM/OS</TableHead>
              <TableHead className="text-xs text-right">Pontos GPS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumo.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            )}
            {resumo.map((t) => (
              <TableRow key={t.login}>
                <TableCell className="text-xs sm:text-sm font-medium">{t.nome}</TableCell>
                <TableCell className="text-xs sm:text-sm text-center capitalize">{t.transporte === 'moto' ? ' Moto' : ' Carro'}</TableCell>
                <TableCell className="text-xs sm:text-sm text-right">{t.kmTotal.toFixed(1)}</TableCell>
                <TableCell className="text-xs sm:text-sm text-right">{t.litros.toFixed(1)} L</TableCell>
                <TableCell className="text-xs sm:text-sm text-right">{t.osTotal}</TableCell>
                <TableCell className="text-xs sm:text-sm text-right">{t.kmPorOs.toFixed(1)}</TableCell>
                <TableCell className="text-xs sm:text-sm text-right">{t.pontosGps}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default KmDataTab;