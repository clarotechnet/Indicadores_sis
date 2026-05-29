import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CIDADES, type Cidade } from '@/types/database';
import logo from '@/assets/logo.jpeg';
import flagNatal from '@/assets/flag-natal.png';
import flagFortaleza from '@/assets/flag-fortaleza.png';
import flagMossoro from '@/assets/flag-mossoro.png';
import flagRecife from '@/assets/flag-recife.png';
import { MapPin, LogOut, ShieldAlert, Loader2 } from 'lucide-react';

const cityFlags: Record<Cidade, string> = {
  'NATAL/PARNAMIRIM': flagNatal,
  'FORTALEZA': flagFortaleza,
  'MOSSORÓ': flagMossoro,
  'RECIFE': flagRecife,
};

const SelecionarCidade = () => {
  const { profile, signOut, profileLoading } = useAuth();
  const { setSelectedCity } = useCity();
  const navigate = useNavigate();

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && profile.status_aprovacao !== 'aprovado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md animate-fade-in shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 sm:h-16 sm:w-16 text-warning mx-auto" />
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">Acesso Pendente</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {profile.status_aprovacao === 'pendente'
                ? 'Seu cadastro está aguardando aprovação de um administrador.'
                : 'Seu cadastro foi rejeitado. Entre em contato com o administrador.'}
            </p>
            <Button variant="outline" onClick={signOut} className="mt-4">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSelectCity = (city: Cidade) => {
    setSelectedCity(city);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="TechNET" className="h-8 sm:h-10 w-auto rounded-lg" />
            <h1 className="text-lg sm:text-xl font-display font-bold text-foreground">TechNET</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.nome}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Seleção de cidade
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Selecionar cidade</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg">Escolha a cidade que deseja acessar</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 max-w-5xl mx-auto">
          {CIDADES.map((city, i) => (
            <Card
              key={city}
              className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-300 animate-fade-in group"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleSelectCity(city)}
            >
              <CardContent className="pt-5 pb-5 sm:pt-8 sm:pb-8 text-center space-y-3 sm:space-y-4">
                <div className="flex justify-center">
                  <img
                    src={cityFlags[city]}
                    alt={`Bandeira ${city}`}
                    className="h-10 sm:h-16 w-auto object-contain group-hover:scale-110 transition-transform duration-300 rounded"
                  />
                </div>
                <h3 className="text-xs sm:text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                  {city}
                </h3>
                <div className="h-1 w-8 sm:w-12 bg-primary/20 rounded-full mx-auto group-hover:w-14 sm:group-hover:w-20 group-hover:bg-primary transition-all duration-300" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SelecionarCidade;
