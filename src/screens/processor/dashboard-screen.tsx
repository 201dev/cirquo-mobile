import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import {
  ArrowRight,
  ClipboardCheck,
  Leaf,
  Recycle,
  Scale,
  Settings2,
  Sprout,
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
  AppCard,
  AppProgress,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatInteger, formatKg, formatPercent } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

const OUTPUT_LABELS = {
  compost: 'Kompos',
  bsf_larvae: 'Larva BSF',
  animal_feed: 'Pakan ternak',
  biogas: 'Biogas',
};

function valueOrDash(
  value: number | null,
  formatter: (value: number) => string,
) {
  return value === null ? '—' : formatter(value);
}

function ProcessorDashboardBody() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken, user } = useAuth();
  const isVerified =
    user?.profile?.type === 'processor' &&
    user.profile.verificationStatus === 'verified';

  const summary = useQuery(
    api.impact.getProcessorSummary,
    sessionToken && isVerified ? { sessionToken } : 'skip',
  );

  if (!isVerified) {
    return (
      <View style={styles.emptyBox}>
        <Recycle size={34} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Menunggu verifikasi fasilitas</Text>
        <Text style={styles.emptySub}>
          Ringkasan operasional tersedia setelah profil Organic Processor
          terverifikasi.
        </Text>
        <AppButton
          variant="outline"
          title="Tinjau status verifikasi"
          onPress={() => navigation.navigate('PendingVerification')}
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  if (summary === undefined) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <AppSkeleton key={idx} height={106} style={styles.gridItem} />
        ))}
      </View>
    );
  }

  const ops = summary.processor;
  const capacityWarning =
    ops.capacityUtilizationPercent !== null &&
    ops.capacityUtilizationPercent >= 90;

  if (!ops.hasBatches) {
    return (
      <View style={styles.emptyBox}>
        <Recycle size={34} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Belum ada batch recovery</Text>
        <Text style={styles.emptySub}>
          Saat material yang sesuai selesai masa pickup, Circular Routing dapat
          menawarkan batch ke fasilitasmu berdasarkan material, radius, dan
          kapasitas harian.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <AppButton
            size="sm"
            title="Buka antrean"
            rightIcon={<ArrowRight size={14} color={colors.white} />}
            onPress={() =>
              navigation.navigate('ProcessorMain', {
                screen: 'ProcessorRecovery',
              })
            }
          />
          <AppButton
            size="sm"
            variant="outline"
            title="Atur kapasitas"
            onPress={() =>
              navigation.navigate('ProcessorMain', {
                screen: 'ProcessorProfile',
              })
            }
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {!summary.integrity.isValid ? (
        <AlertBanner
          tone="warning"
          body={`${summary.integrity.issues.length} catatan ledger perlu diperiksa. Nilai yang belum dapat dipastikan ditampilkan sebagai —.`}
        />
      ) : null}

      {capacityWarning ? (
        <AlertBanner
          tone="warning"
          body={`Kapasitas intake hari ini sudah ${formatPercent(ops.capacityUtilizationPercent!)}. Offer baru dapat dibatasi.`}
        />
      ) : null}

      <View style={styles.grid}>
        <SummaryCard
          style={styles.gridItem}
          label="Offer aktif"
          value={formatInteger(ops.offeredBatchCount)}
          description="Menunggu keputusan"
          icon={<Recycle size={16} color={colors.inProgress} />}
          tone="blue"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Menunggu intake"
          value={formatInteger(ops.acceptedBatchCount)}
          description="Batch sudah diterima"
          icon={<ClipboardCheck size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Menunggu outcome"
          value={formatInteger(ops.collectedBatchCount)}
          description="Intake sudah diukur"
          icon={<Scale size={16} color={colors.primary} />}
        />
        <SummaryCard
          style={styles.gridItem}
          label="Batch terproses"
          value={formatInteger(ops.processedBatchCount)}
          description="Outcome final tercatat"
          icon={<Sprout size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Intake terukur"
          value={valueOrDash(ops.totalMeasuredIntakeGrams, formatKg)}
          description="Dari INTAKE_ACCEPTED"
          icon={<Scale size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Efisiensi recovery"
          value={valueOrDash(ops.recoveryEfficiencyPercent, formatPercent)}
          description="Output usable / intake"
          icon={<Sprout size={16} color={colors.primary} />}
          tone="green"
        />
        <SummaryCard
          style={styles.gridItem}
          label="Residu terukur"
          value={valueOrDash(summary.residualGrams, formatKg)}
          description={`Laju residu ${valueOrDash(ops.residualRatePercent, formatPercent)}`}
          icon={<Scale size={16} color={colors.residual} />}
          tone="amber"
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

      <AppCard style={{ gap: 10 }}>
        <View style={styles.capHeader}>
          <Text style={styles.cardTitle}>Kapasitas intake hari ini</Text>
          <Text style={styles.capNum}>
            {valueOrDash(ops.todayIntakeGrams, formatKg)} /{' '}
            {valueOrDash(ops.dailyCapacityGrams, formatKg)}
          </Text>
        </View>
        <AppProgress value={ops.capacityUtilizationPercent ?? 0} />
        <Text style={styles.muted}>
          {ops.dailyCapacityGrams === 0
            ? 'Intake sedang dijeda; kapasitas harian diatur 0 gram.'
            : ops.capacityUtilizationPercent === null
              ? 'Kapasitas atau intake belum dapat dipastikan.'
              : `${formatPercent(ops.capacityUtilizationPercent)} kapasitas telah digunakan.`}
        </Text>
      </AppCard>

      <AppCard style={{ gap: 8 }}>
        <Text style={styles.cardTitle}>Output terolah</Text>
        <Text style={styles.muted}>Berdasarkan outcome yang telah final.</Text>
        <View style={{ marginTop: 6, gap: 8 }}>
          {Object.entries(OUTPUT_LABELS).map(([type, label]) => (
            <View key={type} style={styles.outputRow}>
              <Text style={styles.muted}>{label}</Text>
              <Text style={styles.outputVal}>
                {summary.recoveredByOutputType === null
                  ? '—'
                  : formatKg(
                      summary.recoveredByOutputType[
                        type as keyof typeof OUTPUT_LABELS
                      ],
                    )}
              </Text>
            </View>
          ))}
        </View>
      </AppCard>

      <ImpactBreakdown
        rescuedGrams={summary.rescuedGrams}
        recoveredGrams={summary.recoveredGrams}
        residualGrams={summary.residualGrams}
        inProgressGrams={summary.inProgressGrams}
      />
    </View>
  );
}

export default function ProcessorDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const processorName =
    user?.profile?.type === 'processor' ? user.profile.name : 'fasilitas';

  return (
    <ScreenScrollView>
      <PageHeader
        title={`Ringkasan ${processorName}`}
        description="Pantau offer, kapasitas, dan outcome berdasarkan batch serta Material Flow Ledger fasilitasmu."
        action={
          <AppButton
            size="sm"
            variant="outline"
            title="Profil"
            leftIcon={<Settings2 size={14} color={colors.foreground} />}
            onPress={() =>
              navigation.navigate('ProcessorMain', {
                screen: 'ProcessorProfile',
              })
            }
          />
        }
      />
      <QueryErrorBoundary title="Ringkasan fasilitas tidak dapat dimuat">
        <ProcessorDashboardBody />
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
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  capHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  capNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  outputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outputVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
});
