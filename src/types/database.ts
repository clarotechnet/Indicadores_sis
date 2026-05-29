export type StatusAprovacao = 'pendente' | 'aprovado' | 'rejeitado';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  status_aprovacao: StatusAprovacao;
  cidade_permitida: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

export interface DadoTecnico {
  id: string;
  login: string;
  nome: string;
  cidade: string;
  supervisor: string;
  created_at: string;
}

export interface IndicadorTecnico {
  id: string;
  data_referencia: string;
  login: string;
  tecnico: string;
  supervisor: string;
  cidade: string;
  nr35: number | null;
  tnps: number | null;
  inspecao_e: number | null;
  revisita: number | null;
  os_dig: number | null;
  geo: number | null;
  ura: number | null;
  tec1: number | null;
  bds: number | null;
  created_at: string;
  updated_at: string;
}

export interface HorarioPrimeiroCliente {
  id: string;
  data_referencia: string;
  login: string;
  tecnico: string;
  supervisor: string;
  cidade: string;
  horario_primeiro_cliente: string;
  classificacao_horario: 'ideal' | 'ruim';
  created_at: string;
  updated_at: string;
}

export interface HorarioEntradaTecnico {
  id: number;
  data: string;
  login_tecnico: string;
  hora_entrada: string;
  cidade: string;
  created_at: string;
}

export interface KmTecnica {
  id: string;
  login_tecnico: string;
  recurso: string;
  data: string;
  trecho: string;
  endereco_destino: string;
  distancia_km: number;
  frente: string;
  cidade: string;
  coord_origem_x: number | null;
  coord_origem_y: number | null;
  coord_destino_x: number | null;
  coord_destino_y: number | null;
  created_at: string;

}

export type IndicadorKey = 'nr35' | 'tnps' | 'inspecao_e' | 'revisita' | 'os_dig' | 'geo' | 'ura' | 'tec1' | 'bds';

export const INDICADOR_LABELS: Record<IndicadorKey, string> = {
  nr35: 'NR35',
  tnps: 'TNPS',
  inspecao_e: 'INSPEÇÃO E.',
  revisita: 'REVISITA',
  os_dig: 'OS_DIG',
  geo: 'GEO',
  ura: 'URA',
  tec1: 'TEC1',
  bds: 'BDS',
};

// Metas de cada indicador (em %)
export const INDICADOR_METAS: Record<IndicadorKey, { valor: number; tipo: 'maior' | 'menor' }> = {
  nr35: { valor: 90, tipo: 'maior' },
  tnps: { valor: 80, tipo: 'maior' },
  inspecao_e: { valor: 80, tipo: 'maior' },
  revisita: { valor: 7, tipo: 'menor' },  // quanto menor melhor
  os_dig: { valor: 95, tipo: 'maior' },
  geo: { valor: 90, tipo: 'maior' },
  ura: { valor: 95, tipo: 'maior' },
  tec1: { valor: 95, tipo: 'maior' },
  bds: { valor: 90, tipo: 'maior' },
};

// Helper: verifica se um valor atinge a meta
export const atingeMeta = (key: IndicadorKey, valor: number): boolean => {
  const meta = INDICADOR_METAS[key];
  return meta.tipo === 'maior' ? valor >= meta.valor : valor <= meta.valor;
};

// Indicadores onde menor é melhor (inverte rankings)
export const INDICADOR_INVERTIDO: Record<IndicadorKey, boolean> = {
  nr35: false,
  tnps: false,
  inspecao_e: false,
  revisita: true,
  os_dig: false,
  geo: false,
  ura: false,
  tec1: false,
  bds: false,
};

export interface SolicitacaoAcesso {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role_solicitado: 'admin' | 'user';
  status: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
}

export const CIDADES = ['NATAL/PARNAMIRIM', 'FORTALEZA', 'MOSSORÓ', 'RECIFE'] as const;
export type Cidade = typeof CIDADES[number];

export interface TransporteTecnico {
  id: string;
  login: string;
  nome: string;
  transporte: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; nome: string; email: string; status_aprovacao: StatusAprovacao; role: 'admin' | 'user' };
        Update: Partial<Profile>;
        Relationships: [];
      };
      dados_tecnicos: {
        Row: DadoTecnico;
        Insert: Partial<DadoTecnico> & { login: string; nome: string; cidade: string; supervisor: string };
        Update: Partial<DadoTecnico>;
        Relationships: [];
      };
      indicadores_tecnicos: {
        Row: IndicadorTecnico;
        Insert: Partial<IndicadorTecnico> & { data_referencia: string; login: string; tecnico: string; supervisor: string; cidade: string };
        Update: Partial<IndicadorTecnico>;
        Relationships: [];
      };
      horario_primeiro_cliente: {
        Row: HorarioPrimeiroCliente;
        Insert: Partial<HorarioPrimeiroCliente> & { data_referencia: string; login: string; tecnico: string; supervisor: string; cidade: string; horario_primeiro_cliente: string; classificacao_horario: 'ideal' | 'ruim' };
        Update: Partial<HorarioPrimeiroCliente>;
        Relationships: [];
      };
      solicitacoes_acesso: {
        Row: SolicitacaoAcesso;
        Insert: Partial<SolicitacaoAcesso> & { user_id: string; nome: string; email: string };
        Update: Partial<SolicitacaoAcesso>;
        Relationships: [];
      };
        km_tecnica: {
        Row: KmTecnica;
        Insert: Omit<KmTecnica, 'id' | 'created_at'>;
        Update: Partial<Omit<KmTecnica, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
