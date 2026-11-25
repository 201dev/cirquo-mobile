import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CircleDollarSign,
  CircleGauge,
  Leaf,
  PackageCheck,
  Recycle,
  Scale,
  Sprout,
} from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ImpactBreakdown } from '@/components/common/impact-breakdown';
import { SummaryCard } from '@/components/common/summary-card';
import { AppButton, AppSkeleton } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatIdr, formatInteger, formatKg, formatPercent } from '@/lib/format';
import { colors, radius } from '@/theme/tokens';

function valueOrDash(
  value: number | null,
  formatter: (value: number) => string,
) {
  return value === null ? '—' : formatter(value);
}

export function MerchantImpactSummary({
  onCreateSurplus,
}: {
  onCreateSurplus?: () => void;
}) {
  const { sessionToken } = useAuth();
  const summary = useQuery(
    api.impact.getMerchantSummary,
    sessionToken ? { sessionToken } : 'skip',
  );

  if (summary === undefined) {
    return (
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <AppSkeleton key={idx} height={108} style={styles.gridItem} />
        ))}
      </View>
    );
  }

  if (summary.listedItemCount === 0) {
    return (
      <View style={styles.emptyBox}>
        <PackageCheck size={36} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Belum ada Rescue Item tercatat</Text>
        <Text style={styles.emptyBody}>
          Buat dan publikasikan Rescue Item pertamamu. Dampak akan diperbarui
          otomatis saat aliran material tercatat.
        </Text>
        {onCreateSurplus ? (
          <AppButton
            variant="outline"
            title="Buat Rescue Item"
            onPress={onCreateSurplus}
            style={{ marginTop: 14 }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dampak material</Text>
        <Text style={styles.sectionSub}>
          Diperbarui otomatis dari Material Flow Ledger · {summary.methodologyVersion}
        </Text>
      </View>

      {!summary.integrity.isValid ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {summary.integrity.issues.length} catatan ledger perlu diperiksa.
            Nilai yang belum dapat dipastikan ditampilkan sebagai —.
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        <SummaryCard
          style={styles.gridItem}
          label="Rescue Item tercatat"
          value={formatInteger(summary.listedItemCount)}
          description="Dipublikasikan ke aliran material"
          icon={<PackageCheck size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Berat tercatat"
          value={formatKg(summary.listedGrams)}
          description="Material masuk ke Cirquo"
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
          description="Output Processor"
          icon={<Sprout size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Residu"
          value={valueOrDash(summary.residualGrams, formatKg)}
          description="Dilaporkan terpisah"
          icon={<Scale size={16} color={colors.residual} />}
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
          value={valueOrDash(summary.circularityRatePercent, formatPercent)}
          description="Rescued + Recovered"
          icon={<CircleGauge size={16} color={colors.inProgress} />}
          tone="blue"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Pendapatan terealisasi"
          value={valueOrDash(summary.revenueRecoveredIdr, formatIdr)}
          description="Nilai pickup Rescued"
          icon={<CircleDollarSign size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={{ width: '100%' }}
          label="Estimated CO2e avoided"
          value={valueOrDash(summary.estimatedCo2eGrams, formatKg)}
          description={`Estimasi berdasarkan ${summary.methodologyVersion}, bukan pengukuran langsung`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  warningBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warning,
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    color: colors.warningForeground,
    lineHeight: 18,
  },
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
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
