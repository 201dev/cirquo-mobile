import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import {
  AlertTriangle,
  CircleGauge,
  Leaf,
  Recycle,
  Scale,
  ShieldCheck,
  UsersRound,
} from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import {
  AlertBanner,
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { ImpactBreakdown } from '@/components/common/impact-breakdown';
import { SummaryCard } from '@/components/common/summary-card';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatInteger, formatKg, formatPercent } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function valueOrDash(
  value: number | null,
  formatter: (value: number) => string,
) {
  return value === null ? '—' : formatter(value);
}

function AdminDashboardBody() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken } = useAuth();
  const summary = useQuery(
    api.impact.getPlatformSummary,
    sessionToken ? { sessionToken } : 'skip',
  );

  if (summary === undefined) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <AppSkeleton key={idx} height={106} style={styles.gridItem} />
        ))}
      </View>
    );
  }

  const qualityRequiresReview =
    !summary.integrity.isValid || summary.platform.circularityRequiresReview;
  const circularity = summary.platform.circularityRequiresReview
    ? 'Periksa data'
    : valueOrDash(summary.circularityRatePercent, formatPercent);

  return (
    <View style={{ gap: 14 }}>
      {summary.listedItemCount === 0 ? (
        <View style={styles.dashedNote}>
          <Text style={styles.muted}>
            Belum ada material yang tercatat di Material Flow Ledger. Angka di
            bawah akan diperbarui otomatis saat alur pertama berjalan.
          </Text>
        </View>
      ) : null}

      {qualityRequiresReview ? (
        <AlertBanner
          tone="warning"
          body={
            summary.platform.circularityRequiresReview
              ? 'Circularity rate melampaui 99%. Periksa Material Flow Ledger sebelum memakai angka ini sebagai laporan.'
              : `${summary.integrity.issues.length} catatan ledger perlu diperiksa. Nilai yang belum dapat dipastikan ditampilkan sebagai —.`
          }
        />
      ) : null}

      <View style={styles.grid}>
        <SummaryCard
          style={styles.gridItem}
          label="Rescue Item tercatat"
          value={formatInteger(summary.listedItemCount)}
          description={formatKg(summary.listedGrams)}
          icon={<Scale size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Terselamatkan"
          value={formatKg(summary.rescuedGrams)}
          description="Pickup terkonfirmasi"
          icon={<Recycle size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Terolah"
          value={valueOrDash(summary.recoveredGrams, formatKg)}
          description="Output usable Processor"
          icon={<Recycle size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Residu"
          value={valueOrDash(summary.residualGrams, formatKg)}
          description="Dilaporkan setara"
          icon={<AlertTriangle size={16} color={colors.residual} />}
          tone="amber"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Dalam proses"
          value={valueOrDash(summary.inProgressGrams, formatKg)}
          description="Belum ada outcome akhir"
          icon={<Recycle size={16} color={colors.inProgress} />}
          tone="blue"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Circularity rate"
          value={circularity}
          description="Rescued + Recovered"
          icon={<CircleGauge size={16} color={colors.inProgress} />}
          tone="blue"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Diversion rate"
          value={valueOrDash(summary.diversionRatePercent, formatPercent)}
          description="Recovered non-rescue"
          icon={<CircleGauge size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Estimated CO2e"
          value={valueOrDash(summary.estimatedCo2eGrams, formatKg)}
          description={summary.methodologyVersion}
          icon={<Leaf size={16} color={colors.inProgress} />}
          tone="blue"
        />
      </View>

      <ImpactBreakdown
        rescuedGrams={summary.rescuedGrams}
        recoveredGrams={summary.recoveredGrams}
        residualGrams={summary.residualGrams}
        inProgressGrams={summary.inProgressGrams}
      />

      <Text style={styles.sectionTitle}>Operasi platform</Text>
      <View style={styles.grid}>
        <SummaryCard
          style={styles.gridItem}
          label="Merchant aktif"
          value={formatInteger(summary.platform.activeMerchantCount)}
          icon={<UsersRound size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Consumer aktif"
          value={formatInteger(summary.platform.activeConsumerCount)}
          icon={<UsersRound size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Processor aktif"
          value={formatInteger(summary.platform.activeProcessorCount)}
          icon={<UsersRound size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Routing gagal"
          value={formatInteger(summary.platform.unroutableBatchCount)}
          description="Perlu tindak lanjut"
          icon={<AlertTriangle size={16} color={colors.residual} />}
          tone="amber"
        />
      </View>

      <View style={styles.qualityCard}>
        <ShieldCheck size={28} color={colors.primary} />
        <Text style={styles.cardTitle}>Kualitas data</Text>
        <Text style={styles.muted}>
          {qualityRequiresReview
            ? 'Ada angka yang perlu ditinjau. Gunakan Material Flow Ledger untuk menelusuri sumbernya sebelum pelaporan.'
            : 'Tidak ada masalah integritas yang terdeteksi dalam ringkasan ini.'}
        </Text>
        <AppButton
          variant="outline"
          title="Buka Material Flow Ledger"
          onPress={() =>
            navigation.navigate('AdminMain', { screen: 'AdminLedger' })
          }
          style={{ marginTop: 10 }}
        />
      </View>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <ScreenScrollView>
      <PageHeader
        title="Ringkasan platform"
        description="Pantau alur material platform secara read-only dari Material Flow Ledger."
        action={
          <AppButton
            size="sm"
            variant="outline"
            title="Operasi"
            onPress={() =>
              navigation.navigate('AdminMain', { screen: 'AdminOperations' })
            }
          />
        }
      />
      <QueryErrorBoundary title="Ringkasan platform tidak dapat dimuat">
        <AdminDashboardBody />
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
  dashedNote: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  qualityCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    padding: 18,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
});
