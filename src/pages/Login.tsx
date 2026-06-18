import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase'; // se seu caminho for outro, ajuste aqui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo.jpeg';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const getResetRedirectUrl = () => {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;

    return new URL(`${normalizedBase}reset-password`, window.location.origin).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccessMessage('');
    setLoading(true);

    const { error } = await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
          : error.message
      );
      return;
    }

    navigate('/selecionar-cidade');
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');

    const emailLimpo = email.trim();

    if (!emailLimpo) {
      setError('Digite seu e-mail no campo acima para receber o link de recuperação.');
      return;
    }

    setResetLoading(true);

    const redirectUrl = getResetRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
      redirectTo: redirectUrl,
    });

    setResetLoading(false);

    if (error) {
      setError(`Erro ao enviar recuperação de senha: ${error.message}`);
      return;
    }

    setSuccessMessage(
      'E-mail de recuperação enviado. Verifique sua caixa de entrada e a pasta de spam.'
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src={logo}
              alt="TechNET"
              className="h-16 w-auto rounded-lg"
              loading="eager"
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-display text-foreground">
              TechNET
            </CardTitle>

            <CardDescription className="text-muted-foreground mt-1">
              Faça login para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 text-green-700 text-sm">
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>

              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>

              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
              >
                {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Entrar
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link to="/cadastro" className="text-primary hover:underline font-medium">
                Cadastre-se
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
