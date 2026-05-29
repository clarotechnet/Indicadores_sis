import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // ajuste se seu caminho for diferente
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
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const navigate = useNavigate();

  const getParamFromUrl = (paramName: string) => {
    const url = new URL(window.location.href);
    const candidates: string[] = [];

    candidates.push(url.search.replace(/^\?/, ''));

    const hash = window.location.hash.replace(/^#/, '');
    candidates.push(hash);

    const questionIndex = hash.indexOf('?');
    if (questionIndex >= 0) {
      candidates.push(hash.slice(questionIndex + 1));
    }

    const secondHashIndex = hash.indexOf('#');
    if (secondHashIndex >= 0) {
      candidates.push(hash.slice(secondHashIndex + 1));
    }

    for (const candidate of candidates) {
      if (!candidate) continue;

      const cleaned = candidate
        .replace(/^\/?reset-password\??/, '')
        .replace(/^\/?login\??/, '');

      const params = new URLSearchParams(cleaned);
      const value = params.get(paramName);

      if (value) return value;
    }

    return null;
  };

  const cleanUrl = () => {
    const currentPath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;

    window.history.replaceState(
      {},
      document.title,
      `${window.location.origin}${currentPath}#/reset-password`
    );
  };

  useEffect(() => {
    const prepareRecoverySession = async () => {
      setCheckingSession(true);
      setError('');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setSessionReady(true);
        setCheckingSession(false);
        return;
      }

      const code = getParamFromUrl('code');
      const accessToken = getParamFromUrl('access_token');
      const refreshToken = getParamFromUrl('refresh_token');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setError(
            'Não foi possível validar o link de recuperação. Solicite um novo e-mail de redefinição.'
          );
          setSessionReady(false);
          setCheckingSession(false);
          return;
        }

        cleanUrl();
        setSessionReady(true);
        setCheckingSession(false);
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setError(
            'Não foi possível criar a sessão de recuperação. Solicite um novo e-mail de redefinição.'
          );
          setSessionReady(false);
          setCheckingSession(false);
          return;
        }

        cleanUrl();
        setSessionReady(true);
        setCheckingSession(false);
        return;
      }

      setError(
        'Sessão de recuperação não encontrada. Abra esta página pelo link enviado no e-mail de recuperação.'
      );
      setSessionReady(false);
      setCheckingSession(false);
    };

    prepareRecoverySession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!sessionReady) {
      setError(
        'A sessão de recuperação não está ativa. Solicite um novo e-mail e abra a tela pelo link recebido.'
      );
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(`Erro ao atualizar senha: ${error.message}`);
      return;
    }

    setSuccessMessage('Senha atualizada com sucesso! Redirecionando para o login...');

    await supabase.auth.signOut();

    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Validando link de recuperação...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Redefinir senha</CardTitle>
          <CardDescription>
            Digite sua nova senha para acessar o sistema.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>

              <Input
                id="password"
                type="password"
                placeholder="Digite a nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={!sessionReady || loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>

              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={!sessionReady || loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !sessionReady}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Atualizar senha
            </Button>

            {!sessionReady && (
              <p className="text-center text-sm text-muted-foreground">
                Voltar para{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  login
                </Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;