import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { Leaf, Scale, WalletCards } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import {
  AlertBanner,
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { SummaryCard } from '@/components/common/summary-card';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatIdr, formatInteger, formatKg } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function ConsumerImpactBody() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken } = useAuth();
  const summary = useQuery(
    api.impact.getConsumerSummary,
    sessionToken ? { sessionToken } : 'skip',
  );

  if (summary === undefined) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((idx) => (
          <AppSkeleton key={idx} height={112} style={styles.gridItem} />
        ))}
      </View>
    );
  }

  if (summary.rescuedQuantity === 0) {
    return (
      <View style={styles.emptyBox}>
        <Scale size={34} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Belum ada pickup selesai</Text>
        <Text style={styles.emptyBody}>
          Dampak pribadi tercatat setelah Merchant mengonfirmasi pickup dengan
          kode yang kamu tunjukkan.
        </Text>
        <AppButton
          variant="outline"
          title="Jelajah Rescue Item"
          onPress={() =>
            navigation.navigate('ConsumerMain', { screen: 'Explore' })
          }
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {!summary.integrity.isValid ? (
        <AlertBanner
          tone="warning"
          body="Data dampakmu belum lengkap. Nilai yang belum dapat dipastikan ditampilkan sebagai —."
        />
      ) : null}

      <View style={styles.grid}>
        <SummaryCard
          style={styles.gridItem}
          label="Paket terselamatkan"
          value={
            summary.rescuedQuantity === null
              ? '—'
              : formatInteger(summary.rescuedQuantity)
          }
          description="Pickup selesai milikmu"
          icon={<Scale size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Berat terselamatkan"
          value={formatKg(summary.rescuedGrams)}
          description="Tercatat saat pickup"
          icon={<Scale size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Hemat"
          value={
            summary.consumerSavingsIdr === null
              ? '—'
              : formatIdr(summary.consumerSavingsIdr)
          }
          description="Dari snapshot harga asli"
          icon={<WalletCards size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Estimated CO2e avoided"
          value={
            summary.estimatedCo2eGrams === null
              ? '—'
              : formatKg(summary.estimatedCo2eGrams)
          }
          description={`Estimasi ${summary.methodologyVersion}`}
          icon={<Leaf size={16} color={colors.inProgress} />}
          tone="blue"
        />
      </View>

      <Text style={styles.footnote}>
        Estimated CO2e avoided adalah hasil metodologi{' '}
        {summary.methodologyVersion}, bukan pengukuran langsung. Hanya pickup
        selesai milikmu yang dihitung.
      </Text>
    </View>
  );
}

export default function ConsumerImpactScreen() {
  return (
    <ScreenScrollView>
      <PageHeader
        title="Dampakmu"
        description="Ringkasan pickup selesai yang tercatat atas namamu di Material Flow Ledger."
      />
      <QueryErrorBoundary title="Dampakmu tidak dapat dimuat">
        <ConsumerImpactBody />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48.3%',
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 19,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
});
