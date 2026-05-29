import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Users, Loader2, ArrowLeft, UserPlus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, StatusAprovacao, SolicitacaoAcesso } from '@/types/database';

const statusConfig: Record<StatusAprovacao, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
};

const Admin = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'admin' | 'user'>>({});

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/selecionar-cidade');
      return;
    }

    void fetchUsers();
    void fetchSolicitacoes();
  }, [profile, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Não foi possível carregar os usuários aprovados.');
      setUsers([]);
    } else {
      setUsers((data as Profile[]) || []);
    }
    setLoading(false);
  };

  const fetchSolicitacoes = async () => {
    setLoadingSolicitacoes(true);
    const { data, error } = await (supabase.from('solicitacoes_acesso') as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error('Não foi possível carregar as solicitações de acesso.');
      setSolicitacoes([]);
      setSelectedRoles({});
      setLoadingSolicitacoes(false);
      return;
    }
    const items = (data as SolicitacaoAcesso[]) || [];
    setSolicitacoes(items);
    const roles: Record<string, 'admin' | 'user'> = {};
    items.forEach((s) => { roles[s.id] = s.role_solicitado as 'admin' | 'user'; });
    setSelectedRoles(roles);
    setLoadingSolicitacoes(false);
  };

  const aprovarSolicitacao = async (solicitacao: SolicitacaoAcesso) => {
    setUpdating(solicitacao.id);
    const role = selectedRoles[solicitacao.id] || 'user';
    const { error: insertError } = await (supabase.from('profiles') as any).upsert(
      { id: solicitacao.user_id, nome: solicitacao.nome, email: solicitacao.email, status_aprovacao: 'aprovado', cidade_permitida: null, role },
      { onConflict: 'id' }
    );
    if (insertError) {
      toast.error(`Falha ao aprovar usuário: ${insertError.message}`);
      setUpdating(null);
      return;
    }
    const { error: deleteError } = await (supabase.from('solicitacoes_acesso') as any).delete().eq('id', solicitacao.id);
    if (deleteError) toast.error(`Usuário aprovado, mas falhou ao remover solicitação: ${deleteError.message}`);
    await fetchUsers();
    await fetchSolicitacoes();
    toast.success('Solicitação aprovada com sucesso.');
    setUpdating(null);
  };

  const rejeitarSolicitacao = async (solicitacao: SolicitacaoAcesso) => {
    setUpdating(solicitacao.id);
    const { error } = await (supabase.from('solicitacoes_acesso') as any).update({ status: 'rejeitado' }).eq('id', solicitacao.id);
    if (error) {
      toast.error(`Falha ao rejeitar solicitação: ${error.message}`);
      setUpdating(null);
      return;
    }
    await fetchSolicitacoes();
    toast.success('Solicitação rejeitada.');
    setUpdating(null);
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    setUpdating(userId);
    const { error } = await (supabase.from('profiles') as any).update({ role }).eq('id', userId);
    if (error) {
      toast.error(`Falha ao atualizar nível de acesso: ${error.message}`);
      setUpdating(null);
      return;
    }
    await fetchUsers();
    toast.success('Nível de acesso atualizado.');
    setUpdating(null);
  };

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;

  // Mobile card view for solicitações
  const SolicitacaoCard = ({ sol }: { sol: SolicitacaoAcesso }) => (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{sol.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{sol.email}</p>
        </div>
        <Badge
          variant={sol.status === 'pendente' ? 'secondary' : sol.status === 'aprovado' ? 'default' : 'destructive'}
          className="shrink-0 ml-2"
        >
          {sol.status === 'pendente' && <Clock className="h-3 w-3 mr-1" />}
          {sol.status.charAt(0).toUpperCase() + sol.status.slice(1)}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
        {sol.status === 'pendente' && (
          <Select
            value={selectedRoles[sol.id] || 'user'}
            onValueChange={(val) => setSelectedRoles((prev) => ({ ...prev, [sol.id]: val as 'admin' | 'user' }))}
          >
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Padrão</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {sol.status === 'pendente' && (
        <div className="flex gap-2">
          {updating === sol.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => aprovarSolicitacao(sol)}>
                <CheckCircle className="h-3 w-3" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => rejeitarSolicitacao(sol)}>
                <XCircle className="h-3 w-3" /> Rejeitar
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  // Mobile card view for users
  const UserCard = ({ user }: { user: Profile }) => (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{user.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <Badge variant={statusConfig[user.status_aprovacao].variant} className="shrink-0 ml-2">
          {statusConfig[user.status_aprovacao].label}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
        {updating === user.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Select value={user.role} onValueChange={(val) => updateUserRole(user.id, val as 'admin' | 'user')}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Padrão</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {user.status_aprovacao !== 'rejeitado' && user.id !== profile?.id && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          disabled={updating === user.id}
          onClick={async () => {
            setUpdating(user.id);
            await (supabase.from('profiles') as any).update({ status_aprovacao: 'rejeitado' }).eq('id', user.id);
            await fetchUsers();
            setUpdating(null);
          }}
        >
          <XCircle className="h-3 w-3" /> Revogar Acesso
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <h2 className="text-lg sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Usuários
          </h2>
          {pendentes > 0 && (
            <Badge variant="destructive" className="text-xs sm:text-sm">
              {pendentes} pendente{pendentes > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="solicitacoes">
          <TabsList>
            <TabsTrigger value="solicitacoes" className="gap-1 text-xs sm:text-sm">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Solicitações</span>
              <span className="sm:hidden">Solic.</span>
              {pendentes > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendentes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-1 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários Aprovados</span>
              <span className="sm:hidden">Aprovados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solicitacoes">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Solicitações de Acesso</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSolicitacoes ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : solicitacoes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma solicitação de acesso.
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 sm:hidden">
                      {solicitacoes.map((sol) => <SolicitacaoCard key={sol.id} sol={sol} />)}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto -mx-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tipo de Acesso</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {solicitacoes.map((sol) => (
                            <TableRow key={sol.id}>
                              <TableCell className="font-medium">{sol.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{sol.email}</TableCell>
                              <TableCell>
                                <Badge variant={sol.status === 'pendente' ? 'secondary' : sol.status === 'aprovado' ? 'default' : 'destructive'}>
                                  {sol.status === 'pendente' && <Clock className="h-3 w-3 mr-1" />}
                                  {sol.status === 'aprovado' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {sol.status === 'rejeitado' && <XCircle className="h-3 w-3 mr-1" />}
                                  {sol.status.charAt(0).toUpperCase() + sol.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {sol.status === 'pendente' ? (
                                  <Select
                                    value={selectedRoles[sol.id] || 'user'}
                                    onValueChange={(val) => setSelectedRoles((prev) => ({ ...prev, [sol.id]: val as 'admin' | 'user' }))}
                                  >
                                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">Padrão</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="capitalize">{sol.role_solicitado === 'admin' ? 'Admin' : 'Padrão'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{new Date(sol.created_at).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell className="text-right space-x-2">
                                {updating === sol.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin inline" />
                                ) : sol.status === 'pendente' ? (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => aprovarSolicitacao(sol)}>
                                      <CheckCircle className="h-3 w-3" /> Aprovar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => rejeitarSolicitacao(sol)}>
                                      <XCircle className="h-3 w-3" /> Rejeitar
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
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
          </TabsContent>

          <TabsContent value="usuarios">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Usuários com Acesso</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 sm:hidden">
                      {users.map((user) => <UserCard key={user.id} user={user} />)}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto -mx-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={statusConfig[user.status_aprovacao].variant}>
                                  {user.status_aprovacao === 'pendente' && <Clock className="h-3 w-3 mr-1" />}
                                  {user.status_aprovacao === 'aprovado' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {user.status_aprovacao === 'rejeitado' && <XCircle className="h-3 w-3 mr-1" />}
                                  {statusConfig[user.status_aprovacao].label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {updating === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin inline" />
                                ) : (
                                  <Select value={user.role} onValueChange={(val) => updateUserRole(user.id, val as 'admin' | 'user')}>
                                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">Padrão</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell className="text-right space-x-2">
                                {user.status_aprovacao !== 'rejeitado' && user.id !== profile?.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updating === user.id}
                                    onClick={async () => {
                                      setUpdating(user.id);
                                      await (supabase.from('profiles') as any).update({ status_aprovacao: 'rejeitado' }).eq('id', user.id);
                                      await fetchUsers();
                                      setUpdating(null);
                                    }}
                                  >
                                    <XCircle className="h-3 w-3" /> Revogar
                                  </Button>
                                )}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
