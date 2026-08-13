import { supabase } from '@/lib/supabase';
import type { Notificacao, NotificacaoDestino, NotificacaoTipo, Profile, SolicitacaoAcesso } from '@/types/database';

export interface NotificationItem {
  id: string;
  readKey: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  cidade: string | null;
  origem: string | null;
  actorNome: string | null;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationInsertInput {
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  cidade?: string | null;
  origem?: string | null;
  actorId?: string | null;
  actorNome?: string | null;
  targetRole?: NotificacaoDestino;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}

interface ImportNotificationInput {
  profile: Profile | null;
  cidade: string | null;
  origem: string;
  total: number;
  skipped?: number;
  fileName?: string;
}

export interface NotificationFetchResult {
  items: NotificationItem[];
  notificationTableAvailable: boolean;
}

const isMissingNotificationTable = (error: { code?: string; message?: string } | null) =>
  Boolean(
    error &&
      (error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.toLowerCase().includes('notificacoes') ||
        error.message?.toLowerCase().includes('notifications')),
  );

const toNotificationItem = (notification: Notificacao): NotificationItem => ({
  id: notification.id,
  readKey: `notificacao:${notification.id}`,
  tipo: notification.tipo,
  titulo: notification.titulo,
  mensagem: notification.mensagem,
  cidade: notification.cidade,
  origem: notification.origem,
  actorNome: notification.actor_nome,
  createdAt: notification.created_at,
});

const pendingAccessToNotification = (request: SolicitacaoAcesso): NotificationItem => ({
  id: request.id,
  readKey: `solicitacao:${request.id}`,
  tipo: 'cadastro_pendente',
  titulo: 'Cadastro aguardando aprovação',
  mensagem: `${request.nome} (${request.email}) solicitou acesso ao sistema.`,
  cidade: null,
  origem: 'Cadastro',
  actorNome: request.nome,
  createdAt: request.created_at,
  actionUrl: '/admin',
});

export const createNotification = async (input: NotificationInsertInput) => {
  const { error } = await supabase.from('notificacoes').insert({
    tipo: input.tipo,
    titulo: input.titulo,
    mensagem: input.mensagem,
    cidade: input.cidade ?? null,
    origem: input.origem ?? null,
    actor_id: input.actorId ?? null,
    actor_nome: input.actorNome ?? null,
    target_role: input.targetRole ?? 'admin',
    target_user_id: input.targetUserId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    if (!isMissingNotificationTable(error)) {
      console.warn('Não foi possível registrar notificação:', error.message);
    }
    return false;
  }

  return true;
};

export const notifyImportCompleted = async ({
  profile,
  cidade,
  origem,
  total,
  skipped = 0,
  fileName,
}: ImportNotificationInput) => {
  if (!profile || total <= 0) return false;

  const registroLabel = total === 1 ? 'registro importado' : 'registros importados';
  const skippedLabel = skipped > 0 ? ` ${skipped} ignorado${skipped > 1 ? 's' : ''}.` : '';

  return createNotification({
    tipo: 'importacao',
    titulo: `Nova importação em ${origem}`,
    mensagem: `${profile.nome} importou ${total.toLocaleString('pt-BR')} ${registroLabel}${cidade ? ` em ${cidade}` : ''}.${skippedLabel}`,
    cidade,
    origem,
    actorId: profile.id,
    actorNome: profile.nome,
    targetRole: 'admin',
    metadata: {
      total,
      skipped,
      fileName: fileName ?? null,
    },
  });
};

export const fetchNotificationItems = async (profile: Profile | null): Promise<NotificationFetchResult> => {
  if (!profile) {
    return { items: [], notificationTableAvailable: true };
  }

  const items: NotificationItem[] = [];
  let notificationTableAvailable = true;

  let notificationQuery = supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);

  if (profile.role !== 'admin') {
    notificationQuery = notificationQuery.or(`target_role.eq.all,target_user_id.eq.${profile.id}`);
  }

  const { data: notifications, error: notificationError } = await notificationQuery;

  if (notificationError) {
    notificationTableAvailable = !isMissingNotificationTable(notificationError);
    if (notificationTableAvailable) {
      console.warn('Não foi possível carregar notificações:', notificationError.message);
    }
  } else {
    items.push(...(((notifications as Notificacao[] | null) ?? []).map(toNotificationItem)));
  }

  if (profile.role === 'admin') {
    const { data: requests, error: requestsError } = await supabase
      .from('solicitacoes_acesso')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(50);

    if (requestsError) {
      console.warn('Não foi possível carregar cadastros pendentes:', requestsError.message);
    } else {
      items.push(...(((requests as SolicitacaoAcesso[] | null) ?? []).map(pendingAccessToNotification)));
    }
  }

  return {
    items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
    notificationTableAvailable,
  };
};
