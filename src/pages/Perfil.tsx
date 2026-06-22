import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  Database,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  UserRound,
} from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { cn } from '@/lib/utils';

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const Perfil = () => {
  const { profile } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    notificationTableAvailable,
    refreshNotifications,
    markAllAsRead,
    markAsRead,
  } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeTab = searchParams.get('tab') === 'notificacoes' ? 'notificacoes' : 'dados';
  const initials = profile?.nome
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'US';

  const handleTabChange = (value: string) => {
    if (value === 'notificacoes') {
      setSearchParams({ tab: 'notificacoes' });
      return;
    }

    setSearchParams({ tab: 'dados' });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="dashboard-container flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Perfil</p>
            <h1 className="font-display text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas informações e acompanhe alertas do sistema.</p>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="cursor-pointer">
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="flex size-24 items-center justify-center rounded-full bg-primary font-display text-3xl font-bold text-primary-foreground">
                {initials}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{profile?.nome || 'Usuário'}</h2>
                <p className="text-sm text-muted-foreground">
                  {profile?.role === 'admin' ? 'Administrador' : 'Operação'}
                </p>
              </div>

              <div className="w-full space-y-3 border-t border-border pt-4 text-left text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" />
                  <span className="min-w-0 truncate">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="size-4" />
                  <span>Perfil: {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <span>Status: {profile?.status_aprovacao === 'aprovado' ? 'Aprovado' : profile?.status_aprovacao}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configurações da conta</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid h-auto w-full grid-cols-2">
                  <TabsTrigger value="dados" className="gap-2">
                    <UserRound className="size-4" />
                    Dados pessoais
                  </TabsTrigger>
                  <TabsTrigger value="notificacoes" className="gap-2">
                    <Bell className="size-4" />
                    Notificações
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="mt-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Nome completo</p>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                        {profile?.nome || '-'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">E-mail</p>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                        {profile?.email || '-'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Nível de acesso</p>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                        {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Cidade permitida</p>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                        {profile?.cidade_permitida || 'Todas'}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notificacoes" className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Central de notificações</h3>
                      <p className="text-xs text-muted-foreground">
                        Importações e cadastros pendentes aparecem aqui.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void refreshNotifications()} className="cursor-pointer">
                        <RefreshCw className="size-4" />
                        Atualizar
                      </Button>
                      <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={notifications.length === 0} className="cursor-pointer">
                        <CheckCheck className="size-4" />
                        Marcar lidas
                      </Button>
                    </div>
                  </div>

                  {!notificationTableAvailable && (
                    <Alert>
                      <Database className="size-4" />
                      <AlertDescription>
                        A tabela de notificações ainda não foi criada no Supabase. Cadastros pendentes aparecem normalmente,
                        mas notificações de importação dependem da migration adicionada ao projeto.
                      </AlertDescription>
                    </Alert>
                  )}

                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                      Nenhuma notificação por enquanto.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => {
                        const isImport = notification.tipo === 'importacao';

                        return (
                          <div
                            key={notification.readKey}
                            className={cn(
                              'flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between',
                              'bg-card hover:bg-muted/30',
                            )}
                          >
                            <div className="flex min-w-0 gap-3">
                              <div className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg', isImport ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning')}>
                                {isImport ? <Database className="size-4" /> : <Bell className="size-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">{notification.titulo}</p>
                                  {notification.cidade && <Badge variant="secondary">{notification.cidade}</Badge>}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{notification.mensagem}</p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {formatDateTime(notification.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.readKey)}
                                className="cursor-pointer"
                              >
                                Lida
                              </Button>
                              {notification.actionUrl && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    markAsRead(notification.readKey);
                                    navigate(notification.actionUrl);
                                  }}
                                  className="cursor-pointer"
                                >
                                  Abrir
                                  <ChevronRight className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Perfil;
