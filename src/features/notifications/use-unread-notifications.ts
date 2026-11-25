import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';

export type NotificationRow = FunctionReturnType<
  typeof api.notifications.listMine
>[number];

function useNotificationNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

export function useMyNotifications() {
  const { sessionToken } = useAuth();
  const now = useNotificationNow();
  return useQuery(
    api.notifications.listMine,
    sessionToken ? { sessionToken, now } : 'skip',
  );
}

export function useUnreadNotificationCount(): number {
  const notifications = useMyNotifications();
  if (notifications === undefined) return 0;
  return notifications.reduce(
    (total, notification) => (notification.readAt === null ? total + 1 : total),
    0,
  );
}
