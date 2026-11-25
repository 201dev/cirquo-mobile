import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { Sprout } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import {
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { StatusBadge } from '@/components/common/status-badge';
import {
  AppCard,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatKg, formatWibDate } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function HistoryBody() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken, user } = useAuth();
  const batches = useQuery(
    api.recoveryBatches.listQueue,
    sessionToken && user?.profile?.verificationStatus === 'verified'
      ? { sessionToken, tab: 'collected' }
      : 'skip',
  );

  if (batches === undefined) {
    return <AppSkeleton height={160} borderRadius={radius.lg} />;
  }

  const processed = batches.filter((b) => b.status === 'processed');
  if (processed.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>
          Belum ada batch yang selesai diproses.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {processed.map((batch) => (
        <Pressable
          key={batch._id}
          onPress={() => navigation.navigate('RecoveryDetail', { id: batch._id })}
        >
          <AppCard style={{ gap: 10 }}>
            <View style={styles.row}>
              <View style={styles.iconBox}>
                <Sprout size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{batch.itemName}</Text>
                <Text style={styles.sub}>
                  {batch.merchantName}
                  {batch.completedAt ? ` · ${formatWibDate(batch.completedAt)}` : ''}
                </Text>
              </View>
              <StatusBadge status={batch.status} />
            </View>
            <View style={styles.metricsRow}>
              <View>
                <Text style={styles.metricLabel}>Output usable</Text>
                <Text style={styles.metricVal}>
                  {formatKg(batch.outputWeightGrams ?? 0)}
                </Text>
              </View>
              <View>
                <Text style={styles.metricLabel}>Residual</Text>
                <Text style={styles.metricVal}>
                  {formatKg(batch.residualWeightGrams ?? 0)}
                </Text>
              </View>
            </View>
          </AppCard>
        </Pressable>
      ))}
    </View>
  );
}

export default function ProcessorHistoryScreen() {
  return (
    <ScreenScrollView>
      <PageHeader
        title="Riwayat outcome"
        description="Batch yang telah selesai diproses oleh fasilitasmu."
      />
      <QueryErrorBoundary title="Riwayat outcome tidak dapat dimuat">
        <HistoryBody />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.recoveredSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  metricVal: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
});
