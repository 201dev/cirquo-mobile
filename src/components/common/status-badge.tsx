import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { statusLabel } from '@/lib/status-labels';
import { colors, radius } from '@/theme/tokens';

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  active: { bg: colors.rescuedSoft, border: colors.rescuedBorder, text: colors.leaf800 },
  verified: { bg: colors.rescuedSoft, border: colors.rescuedBorder, text: colors.leaf800 },
  picked_up: { bg: colors.rescuedSoft, border: colors.rescuedBorder, text: colors.leaf800 },
  RESCUED: { bg: colors.rescuedSoft, border: colors.rescuedBorder, text: colors.leaf800 },
  paid: { bg: colors.inProgressSoft, border: colors.inProgressBorder, text: '#1d5682' },
  ROUTED: { bg: colors.inProgressSoft, border: colors.inProgressBorder, text: '#1d5682' },
  offered: { bg: colors.inProgressSoft, border: colors.inProgressBorder, text: '#1d5682' },
  accepted: { bg: colors.leaf50, border: colors.leaf300, text: colors.leaf800 },
  processed: { bg: colors.recoveredSoft, border: colors.recoveredBorder, text: colors.warningForeground },
  PROCESSED: { bg: colors.recoveredSoft, border: colors.recoveredBorder, text: colors.warningForeground },
  recovered: { bg: colors.recoveredSoft, border: colors.recoveredBorder, text: colors.warningForeground },
  residual: { bg: colors.residualSoft, border: colors.residualBorder, text: '#5c4631' },
  pending: { bg: colors.warning, border: colors.warningBorder, text: colors.warningForeground },
  recovery_pending: { bg: colors.inProgressSoft, border: colors.inProgressBorder, text: '#1d5682' },
  ROUTING_FAILED: { bg: colors.destructiveSoft, border: colors.destructiveBorder, text: colors.destructive },
  unroutable: { bg: colors.destructiveSoft, border: colors.destructiveBorder, text: colors.destructive },
  MODERATED: { bg: colors.destructiveSoft, border: colors.destructiveBorder, text: colors.destructive },
  moderated: { bg: colors.destructiveSoft, border: colors.destructiveBorder, text: colors.destructive },
  rejected: { bg: colors.destructiveSoft, border: colors.destructiveBorder, text: colors.destructive },
  suspended: { bg: colors.destructiveSoft, border: colors.destructiveBorder, text: colors.destructive },
};

export function StatusBadge({
  status,
  inverted = false,
  style,
}: {
  status: string;
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = inverted
    ? { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.28)', text: colors.white }
    : (STATUS_STYLE[status] ?? {
        bg: colors.muted,
        border: colors.border,
        text: colors.foreground,
      });

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone.bg, borderColor: tone.border },
        style,
      ]}
    >
      <Text numberOfLines={1} style={[styles.text, { color: tone.text }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
