import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BadgeDollarSign,
  Bell,
  Building2,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageOpen,
  RefreshCw,
  Route,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import logo from '@/assets/logo.jpeg';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { cn } from '@/lib/utils';
import { USER_ROLE_LABELS, type UserRole } from '@/types/database';

const navItems = [
  { path: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard, roles: ['admin', 'user', 'tecnico'] as UserRole[] },
  { path: '/km-rotas', label: 'KM Rotas', icon: Route, roles: ['admin', 'tecnico'] as UserRole[] },
  { path: '/excesso-miscelaneas', label: 'Miscelâneas', icon: PackageOpen, roles: ['admin'] as UserRole[] },
  { path: '/comissao-gatilho', label: 'Comissão', icon: BadgeDollarSign, roles: ['admin'] as UserRole[] },
];

const DashboardHeader: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { selectedCity, setSelectedCity } = useCity();
  const navigate = useNavigate();
  const location = useLocation();
  const profileRole = profile?.role ?? 'user';
  const visibleNavItems = navItems.filter((item) => item.roles.includes(profileRole));
  const roleLabel = profileRole === 'admin' ? 'Administrador' : USER_ROLE_LABELS[profileRole] ?? 'Operação';

  const handleChangeCity = () => {
    setSelectedCity(null);
    navigate('/selecionar-cidade');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleOpenProfile = () => {
    navigate('/perfil');
  };

  const handleOpenNotifications = () => {
    navigate('/perfil?tab=notificacoes');
  };

  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const renderNavItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const active = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => navigate(item.path)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-slate-300 hover:bg-white/10 hover:text-white',
        )}
      >
        <Icon className="size-4" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col bg-slate-950 text-white shadow-xl lg:flex">
        <div className="flex h-16 items-center gap-3 bg-primary px-5">
          <img src={logo} alt="TechNET" className="size-8 rounded-md bg-white object-cover" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-tight">Indicadores TEC</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-3" aria-label="Menu lateral">
          {visibleNavItems.map(renderNavItem)}

          {profile?.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              aria-current={location.pathname === '/admin' ? 'page' : undefined}
              className={cn(
                'mt-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                location.pathname === '/admin'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              <ShieldCheck className="size-4" />
              <span>Configurações</span>
            </button>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleOpenProfile}
            className="mb-3 w-full cursor-pointer rounded-lg bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950">
                {profile?.nome?.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile?.nome || 'Usuário'}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:ml-56">
        <div className="flex min-h-16 flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <BarChart3 className="size-5" />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleChangeCity}
                  disabled={!selectedCity}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 text-sm font-semibold text-foreground transition-colors hover:text-primary disabled:cursor-default disabled:hover:text-foreground"
                  title="Trocar cidade"
                >
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="truncate">{selectedCity || 'Selecione uma cidade'}</span>
                  {selectedCity && <MapPin className="size-3.5 text-primary" />}
                </button>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Gestão operacional TechNET</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <nav className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 lg:hidden" aria-label="Navegação principal">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative ml-auto hidden size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
              aria-label={`Abrir notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
              title="Abrir notificações"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground md:flex">
              <RefreshCw className="size-3.5" />
              Atualizado: {updatedAt}
            </div>
            <button
              type="button"
              onClick={handleOpenProfile}
              className="hidden min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:flex"
            >
              <UserRound className="size-4 shrink-0" />
              <span className="max-w-[180px] truncate">{profile?.nome}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default DashboardHeader;
