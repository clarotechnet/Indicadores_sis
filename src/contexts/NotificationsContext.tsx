import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchNotificationItems, type NotificationItem } from '@/lib/notifications';

interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  notificationTableAvailable: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => void;
  markAsRead: (readKey: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const storageKeyFor = (profileId: string) => `technet_notifications_read_${profileId}`;

const readStoredKeys = (profileId: string): string[] => {
  try {
    const stored = localStorage.getItem(storageKeyFor(profileId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const writeStoredKeys = (profileId: string, keys: string[]) => {
  try {
    localStorage.setItem(storageKeyFor(profileId), JSON.stringify(keys.slice(-300)));
  } catch {
    // Ignore storage errors; notifications remain usable for the current session.
  }
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationTableAvailable, setNotificationTableAvailable] = useState(true);

  const profileId = profile?.id ?? '';
  const profileRole = profile?.role ?? '';

  const refreshNotifications = useCallback(async () => {
    if (!profile) {
      setNotifications([]);
      setReadKeys([]);
      setNotificationTableAvailable(true);
      return;
    }

    setLoading(true);
    const result = await fetchNotificationItems(profile);
    setNotifications(result.items);
    setNotificationTableAvailable(result.notificationTableAvailable);
    setReadKeys(readStoredKeys(profile.id));
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!profileId || !notificationTableAvailable) return undefined;

    const channel = supabase
      .channel(`app-notifications-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, () => {
        void refreshNotifications();
      });

    if (profileRole === 'admin') {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_acesso' }, () => {
        void refreshNotifications();
      });
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [notificationTableAvailable, profileId, profileRole, refreshNotifications]);

  const unreadCount = useMemo(() => {
    const readSet = new Set(readKeys);
    return notifications.filter((notification) => !readSet.has(notification.readKey)).length;
  }, [notifications, readKeys]);

  const markAllAsRead = useCallback(() => {
    if (!profileId) return;

    const nextKeys = [...new Set([...readStoredKeys(profileId), ...notifications.map((notification) => notification.readKey)])];
    writeStoredKeys(profileId, nextKeys);
    setReadKeys(nextKeys);
  }, [notifications, profileId]);

  const markAsRead = useCallback(
    (readKey: string) => {
      if (!profileId) return;

      const nextKeys = [...new Set([...readStoredKeys(profileId), readKey])];
      writeStoredKeys(profileId, nextKeys);
      setReadKeys(nextKeys);
    },
    [profileId],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      notificationTableAvailable,
      refreshNotifications,
      markAllAsRead,
      markAsRead,
    }),
    [
      notifications,
      unreadCount,
      loading,
      notificationTableAvailable,
      refreshNotifications,
      markAllAsRead,
      markAsRead,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
};
