import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePaginatedQuery, useQuery } from 'convex/react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Search,
} from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  AlertBanner,
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { StatusBadge } from '@/components/common/status-badge';
import {
  AppButton,
  AppCard,
  AppInput,
  AppSkeleton,
  BottomSheetModal,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatInteger, formatWeight, formatWibDateTime } from '@/lib/format';
import { statusLabel } from '@/lib/status-labels';
import { colors, radius } from '@/theme/tokens';

const EVENT_FILTERS = [
  'RESCUED',
  'PROCESSED',
  'ROUTING_FAILED',
  'MODERATED',
  'EXPIRED',
] as const;

function IntegrityOverview({
  sessionToken,
  onInspect,
}: {
  sessionToken: string;
  onInspect: (id: Id<'surplusItems'>) => void;
}) {
  const conservation = useQuery(api.admin.checkWeightConservation, {
    sessionToken,
  });
  const completeness = useQuery(api.admin.checkLedgerCompleteness, {
    sessionToken,
  });

  if (conservation === undefined || completeness === undefined) {
    return <AppSkeleton height={90} borderRadius={radius.lg} />;
  }

  const violations = [...conservation.violations, ...completeness.violations];
  const shown = violations.slice(0, 5);

  return (
    <AppCard
      style={{
        borderColor:
          violations.length > 0
            ? colors.destructiveBorder
            : colors.rescuedBorder,
        gap: 10,
      }}
    >
      <View style={styles.integrityHeader}>
        {violations.length > 0 ? (
          <AlertTriangle size={18} color={colors.destructive} />
        ) : (
          <CheckCircle2 size={18} color={colors.rescued} />
        )}
        <Text style={styles.cardTitle}>Integritas Material Flow Ledger</Text>
      </View>

      {violations.length === 0 ? (
        <Text style={styles.muted}>
          Tidak ada pelanggaran konservasi atau kelengkapan pada{' '}
          {formatInteger(conservation.checkedItems)} Rescue Item terminal dan{' '}
          {formatInteger(completeness.checkedItems)} Rescue Item bermaterial.
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={styles.warnBold}>
            {violations.length} temuan memerlukan pemeriksaan.
          </Text>
          {shown.map((violation, index) => (
            <Pressable
              key={`${violation.surplusItemId}-${index}`}
              onPress={() => onInspect(violation.surplusItemId)}
              style={styles.violationBtn}
            >
              <Text style={styles.violationTitle}>{violation.itemName}</Text>
              <Text style={styles.tiny}>
                {violation.issues.map((i) => i.message).join(' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </AppCard>
  );
}

function ItemInspectorSheet({
  sessionToken,
  itemId,
  onClose,
}: {
  sessionToken: string;
  itemId: Id<'surplusItems'> | null;
  onClose: () => void;
}) {
  const detail = useQuery(
    api.admin.getItemLedger,
    itemId ? { sessionToken, surplusItemId: itemId } : 'skip',
  );

  return (
    <BottomSheetModal
      visible={itemId !== null}
      onClose={onClose}
      title={detail?.item.name ?? 'Inspeksi Ledger'}
      description={detail ? `${detail.item.merchantName}` : undefined}
    >
      {detail === undefined ? (
        <View style={{ gap: 10 }}>
          <AppSkeleton height={60} borderRadius={radius.md} />
          <AppSkeleton height={140} borderRadius={radius.md} />
        </View>
      ) : detail === null ? (
        <Text style={styles.muted}>Rescue Item tidak ditemukan.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <View style={styles.inspectorHeader}>
            <StatusBadge status={detail.item.status} />
            <Text style={styles.tiny}>{detail.item._id}</Text>
          </View>

          {detail.issues.length + detail.summary.integrity.issues.length > 0 ? (
            <AlertBanner
              tone="destructive"
              title="Rekonsiliasi perlu diperiksa"
              body={[...detail.issues, ...detail.summary.integrity.issues]
                .map((w) => w.message)
                .join(' ')}
            />
          ) : (
            <AlertBanner
              tone="success"
              body="Timeline lengkap, urutan masuk akal, dan material terminal terekonsiliasi."
            />
          )}

          <View style={styles.metricsGrid}>
            {[
              ['Listed', detail.summary.listedGrams],
              ['Rescued', detail.summary.rescuedGrams],
              ['Recovered', detail.summary.recoveredGrams],
              ['Residual', detail.summary.residualGrams],
              ['Dalam proses', detail.summary.inProgressGrams],
              ['Process loss', detail.summary.processLossGrams],
            ].map(([label, grams]) => (
              <View key={label as string} style={styles.metricCell}>
                <Text style={styles.tiny}>{label as string}</Text>
                <Text style={styles.metricVal}>
                  {grams === null ? '—' : formatWeight(grams as number)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.cardTitle}>
            Timeline event ({detail.events.length})
          </Text>

          {detail.events.map((event) => (
            <View
              key={event._id}
              style={[
                styles.eventCard,
                event.terminal && { borderColor: colors.primary },
              ]}
            >
              <View style={styles.eventTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <BookOpenCheck size={15} color={colors.primary} />
                  <StatusBadge status={event.eventType} />
                </View>
                <Text style={styles.deltaText}>
                  {event.weightDeltaGrams > 0 ? '+' : ''}
                  {formatWeight(event.weightDeltaGrams)}
                </Text>
              </View>
              <Text style={styles.tiny}>
                {formatWibDateTime(event.occurredAt)} ·{' '}
                {event.actorName ?? 'Sistem'} ({event.actorRole ?? 'sistem'})
              </Text>
              {event.metadata && Object.keys(event.metadata).length > 0 ? (
                <View style={styles.metaBox}>
                  {Object.entries(event.metadata).map(([k, v]) => (
                    <Text key={k} style={styles.tiny}>
                      <Text style={{ fontWeight: '700' }}>{k}: </Text>
                      {typeof v === 'string' ? v : JSON.stringify(v)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </BottomSheetModal>
  );
}

function LedgerBody({ sessionToken }: { sessionToken: string }) {
  const [search, setSearch] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<
    (typeof EVENT_FILTERS)[number] | undefined
  >();
  const [selectedId, setSelectedId] = useState<Id<'surplusItems'> | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.searchLedger,
    {
      sessionToken,
      query: search || undefined,
      eventType: selectedEventType,
    },
    { initialNumItems: 20 },
  );

  return (
    <View style={{ gap: 14 }}>
      <IntegrityOverview
        sessionToken={sessionToken}
        onInspect={setSelectedId}
      />

      <AppCard style={{ gap: 10 }}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.mutedForeground} />
          <AppInput
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setSelectedId(null);
            }}
            placeholder="Cari item, Merchant, ID, atau event"
            style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0 }}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {EVENT_FILTERS.map((ev) => {
            const active = selectedEventType === ev;
            return (
              <Pressable
                key={ev}
                onPress={() => {
                  setSelectedEventType(active ? undefined : ev);
                  setSelectedId(null);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {statusLabel(ev)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </AppCard>

      {status === 'LoadingFirstPage' ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <AppSkeleton key={i} height={96} borderRadius={radius.lg} />
          ))}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>
            Tidak ada Rescue Item yang cocok dengan pencarian ini.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {results.map((row) => (
            <Pressable
              key={row.surplusItemId}
              onPress={() => setSelectedId(row.surplusItemId)}
            >
              <AppCard style={{ gap: 6 }}>
                <View style={styles.rowHeader}>
                  <Text style={styles.itemName}>{row.itemName}</Text>
                  <StatusBadge status={row.status} />
                </View>
                <Text style={styles.tiny}>
                  {row.merchantName} · {row.eventCount} event
                </Text>
                <View style={styles.rowFooter}>
                  <Text style={styles.tiny}>
                    {row.lastEventAt
                      ? formatWibDateTime(row.lastEventAt)
                      : 'Belum ada event'}
                  </Text>
                  <Text style={styles.balanceText}>
                    Saldo {formatWeight(row.balanceGrams)}
                  </Text>
                </View>
              </AppCard>
            </Pressable>
          ))}
        </View>
      )}

      {status === 'CanLoadMore' || status === 'LoadingMore' ? (
        <AppButton
          variant="outline"
          loading={status === 'LoadingMore'}
          title={status === 'LoadingMore' ? 'Memuat...' : 'Muat berikutnya'}
          onPress={() => loadMore(20)}
        />
      ) : null}

      <ItemInspectorSheet
        sessionToken={sessionToken}
        itemId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

export default function AdminLedgerScreen() {
  const { sessionToken } = useAuth();
  return (
    <ScreenScrollView>
      <PageHeader
        title="Material Flow Ledger"
        description="Inspeksi read-only alur material, rekonsiliasi berat, dan bukti outcome tanpa mengubah riwayat."
      />
      <QueryErrorBoundary title="Material Flow Ledger tidak dapat dimuat">
        {sessionToken ? <LedgerBody sessionToken={sessionToken} /> : null}
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  integrityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  tiny: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  warnBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.destructive,
  },
  violationBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 3,
  },
  violationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    paddingHorizontal: 10,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  chipTextActive: {
    color: colors.white,
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    width: '31%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  metricVal: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  eventCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    gap: 6,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  metaBox: {
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    padding: 8,
    gap: 3,
  },
});
