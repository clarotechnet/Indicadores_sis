import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '@/assets/logo.jpeg';
import { LogOut, MapPin, Settings, BarChart3, Route, PackageOpen } from 'lucide-react';

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
  const isKmRotas = location.pathname === '/km-rotas';
  const isMiscelaneas = location.pathname === '/excesso-miscelaneas';

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="TechNET" className="h-8 sm:h-9 w-auto rounded-lg" />
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold text-foreground leading-none">TechNET</h1>
              {selectedCity && (
                <button
                  onClick={handleChangeCity}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                >
                  <MapPin className="h-3 w-3" />
                  {selectedCity}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="text-sm text-muted-foreground hidden md:block">{profile?.nome}</span>
            {profile?.role === 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
          {/* Navigation tabs */}
        <div className="flex gap-1 mt-2 -mb-[1px]">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              !isKmRotas && !isMiscelaneas
                ? 'bg-background text-foreground border-border'
                : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Indicadores
          </button>
          <button
            onClick={() => navigate('/km-rotas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              isKmRotas
                ? 'bg-background text-foreground border-border'
                : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <Route className="h-3.5 w-3.5" />
            KM-ROTAS
          </button>
            <button
            onClick={() => navigate('/excesso-miscelaneas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              isMiscelaneas
                ? 'bg-background text-foreground border-border'
                : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <PackageOpen className="h-3.5 w-3.5" />
            EXC. Miscelâneas
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
