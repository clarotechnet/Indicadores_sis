import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Plus, RefreshCw, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/lib/supabase';
import { type DadoTecnico, type Supervisor } from '@/types/database';

const ALL_FILTER = '__all__';

const normalize = (value: string) => value.trim().toLocaleUpperCase('pt-BR');
const getTechnicianKey = (tecnico: DadoTecnico) => `${normalize(tecnico.cidade)}:${normalize(tecnico.login)}`;

type SupervisorAssignmentSelectProps = {
  tecnico: DadoTecnico;
  supervisores: Supervisor[];
  saving: boolean;
  onChange: (supervisor: string) => void;
};

type TechnicianStatusToggleProps = {
  tecnico: DadoTecnico;
  saving: boolean;
  onChange: (ativo: boolean) => void;
};

const TechnicianStatusToggle = ({ tecnico, saving, onChange }: TechnicianStatusToggleProps) => (
  <div className="flex items-center gap-2">
    <Switch
      checked={tecnico.ativo}
      onCheckedChange={onChange}
      disabled={saving}
      aria-label={`${tecnico.ativo ? 'Desativar' : 'Ativar'} ${tecnico.nome}`}
    />
    <span className={tecnico.ativo ? 'text-sm font-medium text-success' : 'text-sm text-muted-foreground'}>
      {tecnico.ativo ? 'Ativo' : 'Inativo'}
    </span>
    {saving && <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-label="Salvando status" />}
  </div>
);

const SupervisorAssignmentSelect = ({
  tecnico,
  supervisores,
  saving,
  onChange,
}: SupervisorAssignmentSelectProps) => {
  const citySupervisors = supervisores.filter((supervisor) => supervisor.cidade === tecnico.cidade);
  const currentSupervisor = citySupervisors.find(
    (supervisor) => normalize(supervisor.nome) === normalize(tecnico.supervisor || ''),
  );
  const legacyValue = `legacy:${getTechnicianKey(tecnico)}`;
  const value = currentSupervisor ? String(currentSupervisor.id) : tecnico.supervisor ? legacyValue : undefined;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(selectedId) => {
          const supervisor = citySupervisors.find((item) => String(item.id) === selectedId);
          if (supervisor) onChange(supervisor.nome);
        }}
        disabled={saving || (citySupervisors.length === 0 && !tecnico.supervisor)}
      >
        <SelectTrigger aria-label={`Supervisor de ${tecnico.nome}`} className="w-full min-w-[190px]">
          <SelectValue placeholder="Selecionar supervisor" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Supervisores de {tecnico.cidade}</SelectLabel>
            {!currentSupervisor && tecnico.supervisor && (
              <SelectItem value={legacyValue}>{tecnico.supervisor} (não cadastrado)</SelectItem>
            )}
            {citySupervisors.map((supervisor) => (
              <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                {supervisor.nome}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {saving && <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-label="Salvando supervisor" />}
    </div>
  );
};

const SupervisorManagementTab = () => {
  const { selectedCity } = useCity();
  const [tecnicos, setTecnicos] = useState<DadoTecnico[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingTecnicoKey, setSavingTecnicoKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingSupervisor, setSavingSupervisor] = useState(false);
  const [novoSupervisorNome, setNovoSupervisorNome] = useState('');
  const [search, setSearch] = useState('');
  const [supervisorFiltroId, setSupervisorFiltroId] = useState(ALL_FILTER);

  const loadData = useCallback(async () => {
    if (!selectedCity) {
      setTecnicos([]);
      setSupervisores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    const [tecnicosResult, supervisoresResult] = await Promise.all([
      supabase
        .from('dados_tecnicos')
        .select('*')
        .eq('cidade', selectedCity)
        .order('nome', { ascending: true }),
      supabase
        .from('supervisores')
        .select('*')
        .eq('ativo', true)
        .eq('cidade', selectedCity)
        .order('nome', { ascending: true }),
    ]);

    if (tecnicosResult.error || supervisoresResult.error) {
      setTecnicos([]);
      setSupervisores([]);
      setLoadError(tecnicosResult.error?.message ?? supervisoresResult.error?.message ?? 'Erro ao carregar técnicos.');
      setLoading(false);
      return;
    }

    setTecnicos((tecnicosResult.data as DadoTecnico[]) || []);
    setSupervisores((supervisoresResult.data as Supervisor[]) || []);
    setLoading(false);
  }, [selectedCity]);

  useEffect(() => {
    setSupervisorFiltroId(ALL_FILTER);
    void loadData();
  }, [loadData, selectedCity]);

  const supervisorSelecionado = useMemo(
    () => supervisores.find((supervisor) => String(supervisor.id) === supervisorFiltroId),
    [supervisorFiltroId, supervisores],
  );

  const tecnicosFiltrados = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');

    return tecnicos.filter((tecnico) => {
      const matchSupervisor = !supervisorSelecionado
        || normalize(tecnico.supervisor || '') === supervisorSelecionado.nome_normalizado;
      const matchBusca = !term || [tecnico.login, tecnico.nome, tecnico.supervisor, tecnico.cidade]
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));

      return matchSupervisor && matchBusca;
    });
  }, [search, supervisorSelecionado, tecnicos]);

  const totalTecnicosAtivos = useMemo(
    () => tecnicos.filter((tecnico) => tecnico.ativo).length,
    [tecnicos],
  );

  const updateTechnicianSupervisor = async (tecnico: DadoTecnico, supervisor: string) => {
    if (normalize(tecnico.supervisor || '') === normalize(supervisor)) return;

    setSavingTecnicoKey(getTechnicianKey(tecnico));
    const { error } = await supabase
      .from('dados_tecnicos')
      .update({ supervisor })
      .eq('login', tecnico.login)
      .eq('cidade', tecnico.cidade);

    if (error) {
      toast.error(`Não foi possível atualizar ${tecnico.nome}: ${error.message}`);
      setSavingTecnicoKey(null);
      return;
    }

    setTecnicos((current) => current.map((item) => (
      getTechnicianKey(item) === getTechnicianKey(tecnico) ? { ...item, supervisor } : item
    )));
    setSavingTecnicoKey(null);
    toast.success(`Supervisor de ${tecnico.nome} atualizado.`);
  };

  const updateTechnicianStatus = async (tecnico: DadoTecnico, ativo: boolean) => {
    if (tecnico.ativo === ativo) return;

    setSavingTecnicoKey(getTechnicianKey(tecnico));
    const { error } = await supabase
      .from('dados_tecnicos')
      .update({ ativo })
      .eq('login', tecnico.login)
      .eq('cidade', tecnico.cidade);

    if (error) {
      toast.error(`Não foi possível atualizar ${tecnico.nome}: ${error.message}`);
      setSavingTecnicoKey(null);
      return;
    }

    setTecnicos((current) => current.map((item) => (
      getTechnicianKey(item) === getTechnicianKey(tecnico) ? { ...item, ativo } : item
    )));
    setSavingTecnicoKey(null);
    toast.success(`${tecnico.nome} está ${ativo ? 'ativo' : 'inativo'}.`);
  };

  const openNewSupervisorDialog = () => {
    setNovoSupervisorNome('');
    setDialogOpen(true);
  };

  const createSupervisor = async (event: React.FormEvent) => {
    event.preventDefault();
    const nome = novoSupervisorNome.trim().toLocaleUpperCase('pt-BR');

    if (!nome) {
      toast.error('Informe o nome do supervisor.');
      return;
    }

    if (!selectedCity) {
      toast.error('Selecione uma cidade antes de cadastrar um supervisor.');
      return;
    }

    setSavingSupervisor(true);
    const { data, error } = await supabase
      .from('supervisores')
      .insert({ nome, cidade: selectedCity })
      .select('*')
      .single();

    if (error) {
      toast.error(error.code === '23505'
        ? 'Esse supervisor já está cadastrado para essa cidade.'
        : `Não foi possível cadastrar o supervisor: ${error.message}`);
      setSavingSupervisor(false);
      return;
    }

    setSupervisores((current) => [...current, data as Supervisor]
      .sort((a, b) => `${a.cidade}-${a.nome}`.localeCompare(`${b.cidade}-${b.nome}`, 'pt-BR')));
    setSupervisorFiltroId(ALL_FILTER);
    setDialogOpen(false);
    setSavingSupervisor(false);
    toast.success('Supervisor cadastrado e disponível nas opções.');
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="size-5 text-primary" />
                Técnicos e supervisores
              </CardTitle>
              <CardDescription className="mt-1">
                Atualize a referência de supervisor usada nas próximas importações de indicadores.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{totalTecnicosAtivos} ativos de {tecnicos.length} técnicos</Badge>
              <Badge variant="secondary">{supervisores.length} supervisores</Badge>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
                <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : undefined} />
                Atualizar
              </Button>
              <Button type="button" size="sm" onClick={openNewSupervisorDialog} disabled={!selectedCity}>
                <Plus data-icon="inline-start" />
                Supervisor
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {loadError && (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1.4fr)_minmax(180px,0.7fr)_minmax(220px,0.9fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-tecnico-busca">Buscar técnico</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-tecnico-busca"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Login, nome ou supervisor"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-tecnico-cidade">Cidade</Label>
              <Input id="admin-tecnico-cidade" value={selectedCity ?? ''} disabled />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-tecnico-supervisor">Supervisor</Label>
              <Select value={supervisorFiltroId} onValueChange={setSupervisorFiltroId}>
                <SelectTrigger id="admin-tecnico-supervisor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Supervisores</SelectLabel>
                    <SelectItem value={ALL_FILTER}>Todos</SelectItem>
                    {supervisores.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                        {supervisor.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Carregando técnicos e supervisores...
            </div>
          ) : tecnicosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum técnico encontrado para os filtros atuais.
            </div>
          ) : (
            <>
              <div className="divide-y rounded-md border md:hidden">
                {tecnicosFiltrados.map((tecnico) => (
                  <div key={getTechnicianKey(tecnico)} className="flex flex-col gap-3 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{tecnico.nome}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{tecnico.login}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">{tecnico.cidade}</Badge>
                    </div>
                    <SupervisorAssignmentSelect
                      tecnico={tecnico}
                      supervisores={supervisores}
                      saving={savingTecnicoKey === getTechnicianKey(tecnico)}
                      onChange={(supervisor) => void updateTechnicianSupervisor(tecnico, supervisor)}
                    />
                    <TechnicianStatusToggle
                      tecnico={tecnico}
                      saving={savingTecnicoKey === getTechnicianKey(tecnico)}
                      onChange={(ativo) => void updateTechnicianStatus(tecnico, ativo)}
                    />
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Login</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tecnicosFiltrados.map((tecnico) => (
                      <TableRow key={getTechnicianKey(tecnico)}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{tecnico.login}</TableCell>
                        <TableCell className="font-medium">{tecnico.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="size-3.5" />
                            {tecnico.cidade}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SupervisorAssignmentSelect
                            tecnico={tecnico}
                            supervisores={supervisores}
                            saving={savingTecnicoKey === getTechnicianKey(tecnico)}
                            onChange={(supervisor) => void updateTechnicianSupervisor(tecnico, supervisor)}
                          />
                        </TableCell>
                        <TableCell>
                          <TechnicianStatusToggle
                            tecnico={tecnico}
                            saving={savingTecnicoKey === getTechnicianKey(tecnico)}
                            onChange={(ativo) => void updateTechnicianStatus(tecnico, ativo)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Adicionar supervisor
            </DialogTitle>
            <DialogDescription>
              O supervisor ficará disponível para os técnicos da cidade ativa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createSupervisor} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-supervisor-nome">Nome do supervisor</Label>
              <Input
                id="novo-supervisor-nome"
                value={novoSupervisorNome}
                onChange={(event) => setNovoSupervisorNome(event.target.value)}
                placeholder="NOME COMPLETO"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-supervisor-cidade">Cidade</Label>
              <Input id="novo-supervisor-cidade" value={selectedCity ?? ''} disabled />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={savingSupervisor}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingSupervisor}>
                {savingSupervisor && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Salvar supervisor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupervisorManagementTab;
