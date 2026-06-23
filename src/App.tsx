import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import SelecionarCidade from "./pages/SelecionarCidade";
import Dashboard from "./pages/Dashboard";
import KmRotas from "./pages/KmRotas";
import ExcessoMiscelaneas from "./pages/ExcessoMiscelaneas";
import ComissaoGatilho from "./pages/ComissaoGatilho";
import Admin from "./pages/Admin";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import React from "react";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ResetPasswordPage from './pages/ResetPasswordPage';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, profileLoading, signOut } = useAuth();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Bloqueia acesso se não existe perfil aprovado.
  if (!profile || profile.status_aprovacao !== 'aprovado') {
    const isRejected = profile?.status_aprovacao === 'rejeitado';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-warning mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              {isRejected ? 'Acesso Rejeitado' : 'Acesso Pendente'}
            </h2>
            <p className="text-muted-foreground">
              {isRejected
                ? 'Seu cadastro foi rejeitado. Entre em contato com o administrador.'
                : 'Seu cadastro está aguardando aprovação de um administrador.'}
            </p>
            <Button variant="outline" onClick={signOut} className="mt-4">
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/selecionar-cidade" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CityProvider>
            <NotificationsProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/cadastro" element={<PublicRoute><Cadastro /></PublicRoute>} />
                <Route path="/selecionar-cidade" element={<ProtectedRoute><SelecionarCidade /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/km-rotas" element={<ProtectedRoute><KmRotas /></ProtectedRoute>} />
                <Route path="/excesso-miscelaneas" element={<ProtectedRoute><ExcessoMiscelaneas /></ProtectedRoute>} />
                <Route path="/comissao-gatilho" element={<ProtectedRoute><ComissaoGatilho /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </NotificationsProvider>
          </CityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
