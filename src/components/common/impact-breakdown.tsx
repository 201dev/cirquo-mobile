import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatKg } from '@/lib/format';
import { colors, radius } from '@/theme/tokens';

interface ImpactBreakdownProps {
  rescuedGrams: number;
  recoveredGrams: number | null;
  residualGrams: number | null;
  inProgressGrams: number | null;
}

const SEGMENTS = [
  { key: 'rescuedGrams', label: 'Terselamatkan', color: colors.rescued },
  { key: 'recoveredGrams', label: 'Terolah', color: colors.recovered },
  { key: 'residualGrams', label: 'Residu', color: colors.residual },
  { key: 'inProgressGrams', label: 'Dalam proses', color: colors.inProgress },
] as const;

export function ImpactBreakdown(props: ImpactBreakdownProps) {
  const values = SEGMENTS.map((segment) => props[segment.key]);
  const hasCompleteOutcome = values.every((value) => value !== null);
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const hasMaterial = total > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Aliran material</Text>
          <Text style={styles.subtitle}>
            Setiap kilogram tetap terlihat sampai hasil akhirnya.
          </Text>
        </View>
        <Text style={styles.total}>
          {hasMaterial ? formatKg(total) : '—'}
        </Text>
      </View>

      {hasCompleteOutcome && hasMaterial ? (
        <View style={styles.bar}>
          {SEGMENTS.map((segment) => {
            const val = props[segment.key] ?? 0;
            if (val <= 0) return null;
            return (
              <View
                key={segment.key}
                style={{
                  flex: val,
                  backgroundColor: segment.color,
                  height: '100%',
                }}
              />
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyNote}>
          {hasCompleteOutcome
            ? 'Belum ada material yang tercatat.'
            : 'Sebagian outcome memerlukan pemeriksaan sebelum aliran divisualkan.'}
        </Text>
      )}

      <View style={styles.legendGrid}>
        {SEGMENTS.map((segment) => {
          const value = props[segment.key];
          return (
            <View key={segment.key} style={styles.legendItem}>
              <View style={styles.legendLabelRow}>
                <View style={[styles.dot, { backgroundColor: segment.color }]} />
                <Text style={styles.legendLabel}>{segment.label}</Text>
              </View>
              <Text style={styles.legendValue}>
                {value === null ? '—' : formatKg(value)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    backgroundColor: colors.foreground,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(247, 250, 248, 0.72)',
  },
  total: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: -0.5,
  },
  bar: {
    marginTop: 16,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(247, 250, 248, 0.16)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  emptyNote: {
    marginTop: 14,
    fontSize: 13,
    color: 'rgba(247, 250, 248, 0.72)',
  },
  legendGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    width: '46%',
  },
  legendLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: 'rgba(247, 250, 248, 0.72)',
  },
  legendValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
