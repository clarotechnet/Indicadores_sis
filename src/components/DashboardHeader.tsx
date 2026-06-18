import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, LogOut, MapPin, PackageOpen, Route, Settings, UserRound } from 'lucide-react';

import logo from '@/assets/logo.jpeg';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Indicadores', icon: BarChart3 },
  { path: '/km-rotas', label: 'KM Rotas', icon: Route },
  { path: '/excesso-miscelaneas', label: 'Miscelâneas', icon: PackageOpen },
];

const DashboardHeader: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { selectedCity, setSelectedCity } = useCity();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChangeCity = () => {
    setSelectedCity(null);
    navigate('/selecionar-cidade');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="dashboard-container py-2 sm:py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background p-1">
                <img src={logo} alt="TechNET" className="size-full rounded-md object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-base font-bold leading-tight text-foreground sm:text-lg">
                  Indicadores SIS
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">Gestão operacional TechNET</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2">
              {selectedCity && (
                <button
                  type="button"
                  onClick={handleChangeCity}
                  className="hidden max-w-[180px] cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 sm:flex"
                  title="Trocar cidade"
                >
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{selectedCity}</span>
                </button>
              )}

              <div className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex">
                <UserRound className="size-4 shrink-0" />
                <span className="max-w-[180px] truncate">{profile?.nome}</span>
              </div>

              {profile?.role === 'admin' && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="cursor-pointer">
                  <Settings />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleLogout} className="cursor-pointer">
                <LogOut />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {selectedCity && (
              <button
                type="button"
                onClick={handleChangeCity}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 sm:hidden"
                title="Trocar cidade"
              >
                <MapPin className="size-3.5 shrink-0 text-primary" />
                <span className="max-w-[160px] truncate">{selectedCity}</span>
              </button>
            )}

            <nav className="flex w-max items-center gap-1 rounded-lg border border-border bg-background p-1" aria-label="Navegação principal">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
