import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      setProfile(null);
      return null;
    }

    const profileData = (data as Profile | null) ?? null;
    setProfile(profileData);
    return profileData;
  };

  const createMissingProfile = async (authUser: User): Promise<Profile | null> => {
    const nome = String(authUser.user_metadata?.nome ?? authUser.email?.split('@')[0] ?? 'Usuário');
    const email = authUser.email ?? '';

    const { error } = await (supabase.from('solicitacoes_acesso') as any)
      .upsert(
        {
          user_id: authUser.id,
          nome,
          email,
          role_solicitado: 'user',
          status: 'pendente',
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('Erro ao criar solicitação de acesso:', error);
    }

    return null;
  };

  const ensureProfile = async (authUser: User) => {
    setProfileLoading(true);
    try {
      const existingProfile = await fetchProfile(authUser.id);
      if (!existingProfile) {
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
    let initialLoad = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Only show loading spinner on initial load, not on token refresh
          if (initialLoad) {
            setTimeout(() => {
              void ensureProfile(currentSession.user);
            }, 0);
          } else if (!profile) {
            // Silently fetch profile without setting profileLoading
            fetchProfile(currentSession.user.id);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
        initialLoad = false;
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
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

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!error && data.user) {
      // Insert into solicitacoes_acesso (staging table)
      await (supabase.from('solicitacoes_acesso') as any).upsert(
        {
          user_id: data.user.id,
          nome,
          email,
          role_solicitado: 'user',
          status: 'pendente',
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
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
