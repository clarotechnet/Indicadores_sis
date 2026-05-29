import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ExcessoMiscelanea } from '@/pages/ExcessoMiscelaneas';

interface Props {
  data: ExcessoMiscelanea[];
  tecnicos: string[];
}

const MiscPainelTecnico: React.FC<Props> = ({ data, tecnicos }) => {
  const [selectedTecnico, setSelectedTecnico] = useState('');

  const tecnicoData = useMemo(() => {
    if (!selectedTecnico) return [];
    return data.filter(d => d.tecnico === selectedTecnico);
  }, [data, selectedTecnico]);

  // Group by data + contrato + equipamento and sum qtde
  const grouped = useMemo(() => {
    const map = new Map<string, { data_execucao: string; contrato: string; equipamento: string; qtde: number }>();
    tecnicoData.forEach(d => {
      const key = `${d.data_execucao}|${d.contrato}|${d.equipamento}`;
      const existing = map.get(key);
      if (existing) {
        existing.qtde += (d.qtde || 0);
      } else {
        map.set(key, {
          data_execucao: d.data_execucao,
          contrato: d.contrato,
          equipamento: d.equipamento,
          qtde: d.qtde || 0,
        });
      }
    });
    return [...map.values()].sort((a, b) => a.data_execucao.localeCompare(b.data_execucao));
  }, [tecnicoData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Painel Individual do Técnico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Select value={selectedTecnico} onValueChange={setSelectedTecnico}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTecnico && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead className="text-center">Qtde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {new Date(row.data_execucao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </TableCell>
                    <TableCell>{row.contrato}</TableCell>
                    <TableCell>{row.equipamento}</TableCell>
                    <TableCell className="text-center font-semibold">{row.qtde}</TableCell>
                  </TableRow>
                ))}
                {grouped.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {selectedTecnico ? 'Nenhum excesso encontrado.' : 'Selecione um técnico.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MiscPainelTecnico;