import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from 'convex/react';
import { Bell, CheckCircle2 } from 'lucide-react-native';
import { api } from '../../convex/_generated/api';
import {
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import {
  useMyNotifications,
  type NotificationRow,
} from '@/features/notifications/use-unread-notifications';
import { getErrorMessage } from '@/lib/errors';
import { formatWibDateTime } from '@/lib/format';
import {
  parseHrefToRoute,
  type RootStackParamList,
} from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function NotificationsBody() {
  const { sessionToken, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const notifications = useMyNotifications();
  const markRead = useMutation(api.notifications.markRead);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!sessionToken) return null;

  if (notifications === undefined) {
    return (
      <View style={styles.list}>
        {[0, 1, 2, 3].map((idx) => (
          <AppSkeleton key={idx} height={106} borderRadius={radius.lg} />
        ))}
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Belum ada notifikasi.</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  const openNotification = async (notification: NotificationRow) => {
    setBusyId(notification._id);
    try {
      if (notification.readAt === null) {
        await markRead({ sessionToken, notificationId: notification._id });
      }
      if (notification.href) {
        const target = parseHrefToRoute(notification.href, user?.role);
        if (target) {
          const nav = navigation as unknown as {
            navigate: (name: string, params?: Record<string, unknown>) => void;
          };
          nav.navigate(target.name, target.params);
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Notifikasi tidak dapat diperbarui.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.list}>
      <Text style={styles.statusText}>
        {unreadCount === 0
          ? `${notifications.length} notifikasi, semuanya sudah dibaca.`
          : `${unreadCount} dari ${notifications.length} notifikasi belum dibaca.`}
      </Text>

      {notifications.map((notification) => {
        const read = notification.readAt !== null;
        return (
          <View
            key={notification._id}
            style={[styles.card, !read && styles.cardUnread]}
          >
            <View style={styles.row}>
              <View style={styles.iconBox}>
                {read ? (
                  <CheckCircle2 size={20} color={colors.primary} />
                ) : (
                  <Bell size={20} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{notification.title}</Text>
                <Text style={styles.body}>{notification.body}</Text>
                <Text style={styles.time}>
                  {formatWibDateTime(notification.visibleAt)}
                </Text>
              </View>
            </View>
            {notification.href || !read ? (
              <AppButton
                variant="outline"
                size="sm"
                loading={busyId === notification._id}
                title={notification.href ? 'Buka' : 'Tandai dibaca'}
                onPress={() => void openNotification(notification)}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function NotificationsScreen() {
  return (
    <ScreenScrollView>
      <PageHeader
        title="Notifikasi"
        description="Pembaruan lifecycle yang relevan untuk akunmu, tanpa pickup code atau data pembayaran privat."
      />
      <QueryErrorBoundary title="Notifikasi tidak dapat dimuat">
        <NotificationsBody />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  statusText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  cardUnread: {
    borderColor: colors.leaf300,
    backgroundColor: colors.leaf50,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  body: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  time: {
    marginTop: 6,
    fontSize: 11,
    color: colors.ink500,
  },
});
