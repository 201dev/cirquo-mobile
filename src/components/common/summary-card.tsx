import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';

interface SummaryCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  tone?: 'default' | 'green' | 'blue' | 'amber';
  style?: StyleProp<ViewStyle>;
}

const TONE_BG = {
  default: colors.card,
  green: colors.secondary,
  blue: colors.inProgressSoft,
  amber: colors.residualSoft,
};

export function SummaryCard({
  label,
  value,
  description,
  icon,
  tone = 'default',
  style,
}: SummaryCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: TONE_BG[tone],
          borderColor: tone === 'default' ? colors.border : 'transparent',
          borderWidth: tone === 'default' ? 1 : 0,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {icon ? <View style={styles.iconBox}>{icon}</View> : null}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedForeground,
  },
});
