import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, SolicitacaoAcesso, UserRole } from '@/types/database';

interface SignUpOptions {
  roleSolicitado?: UserRole;
  loginTecnico?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, nome: string, options?: SignUpOptions) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeTechnicianLogin = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized || null;
};

const isInvalidRefreshToken = (error: AuthError | null) =>
  Boolean(error && /invalid refresh token|refresh token not found/i.test(error.message));

const buildPendingProfile = (authUser: User, solicitacao?: SolicitacaoAcesso | null): Profile => ({
  id: authUser.id,
  nome: String(solicitacao?.nome ?? authUser.user_metadata?.nome ?? authUser.email?.split('@')[0] ?? 'Usuário'),
  email: String(solicitacao?.email ?? authUser.email ?? ''),
  status_aprovacao: solicitacao?.status === 'rejeitado' ? 'rejeitado' : 'pendente',
  cidade_permitida: null,
  role: solicitacao?.role_solicitado ?? 'user',
  login_tecnico: normalizeTechnicianLogin(solicitacao?.login_tecnico ?? authUser.user_metadata?.login_tecnico),
  created_at: solicitacao?.created_at ?? new Date().toISOString(),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const updateProfile = (nextProfile: Profile | null) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      updateProfile(null);
      return null;
    }

    const profileData = (data as Profile | null) ?? null;
    updateProfile(profileData);
    return profileData;
  };

  const fetchAccessRequest = async (userId: string): Promise<SolicitacaoAcesso | null> => {
    const { data, error } = await supabase
      .from('solicitacoes_acesso')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar solicitação de acesso:', error);
      return null;
    }

    return (data as SolicitacaoAcesso | null) ?? null;
  };

  const createMissingProfile = async (authUser: User): Promise<Profile> => {
    const nome = String(authUser.user_metadata?.nome ?? authUser.email?.split('@')[0] ?? 'Usuário');
    const email = authUser.email ?? '';
    const roleSolicitado = (authUser.user_metadata?.role_solicitado as UserRole | undefined) ?? 'user';
    const loginTecnico = normalizeTechnicianLogin(authUser.user_metadata?.login_tecnico);

    const { error } = await supabase
      .from('solicitacoes_acesso')
      .upsert(
        {
          user_id: authUser.id,
          nome,
          email,
          role_solicitado: roleSolicitado,
          login_tecnico: loginTecnico,
          status: 'pendente',
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('Erro ao criar solicitação de acesso:', error);
    }

    const solicitacao = await fetchAccessRequest(authUser.id);
    const pendingProfile = buildPendingProfile(authUser, solicitacao);
    updateProfile(pendingProfile);
    return pendingProfile;
  };

  const ensureProfile = async (authUser: User) => {
    setProfileLoading(true);
    try {
      const existingProfile = await fetchProfile(authUser.id);
      if (!existingProfile) {
        const solicitacao = await fetchAccessRequest(authUser.id);
        if (solicitacao) {
          updateProfile(buildPendingProfile(authUser, solicitacao));
          return;
        }
        await createMissingProfile(authUser);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const currentProfile = profileRef.current;
          if (currentProfile?.id !== currentSession.user.id || currentProfile.status_aprovacao !== 'aprovado') {
            setProfileLoading(true);
            setTimeout(() => {
              void ensureProfile(currentSession.user);
            }, 0);
          }
        } else {
          updateProfile(null);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession }, error }) => {
      if (isInvalidRefreshToken(error)) {
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        updateProfile(null);
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await ensureProfile(currentSession.user);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string, options?: SignUpOptions) => {
    const roleSolicitado = options?.roleSolicitado ?? 'user';
    const loginTecnico = normalizeTechnicianLogin(options?.loginTecnico);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, role_solicitado: roleSolicitado, login_tecnico: loginTecnico },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!error && data.user) {
      // Insert into solicitacoes_acesso (staging table)
      await supabase.from('solicitacoes_acesso').upsert(
        {
          user_id: data.user.id,
          nome,
          email,
          role_solicitado: roleSolicitado,
          login_tecnico: loginTecnico,
          status: 'pendente',
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    updateProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
