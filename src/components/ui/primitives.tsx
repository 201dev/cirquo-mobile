import React, { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { colors, radius, shadowCard } from '@/theme/tokens';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export function AppButton({
  title,
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'default'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : variant === 'destructive'
          ? colors.destructive
          : variant === 'outline'
            ? colors.card
            : 'transparent';

  const borderColor =
    variant === 'outline'
      ? colors.border
      : variant === 'destructive'
        ? colors.destructive
        : 'transparent';

  const textColor =
    variant === 'default' || variant === 'destructive'
      ? colors.primaryForeground
      : variant === 'secondary'
        ? colors.primary
        : colors.foreground;

  const heightStyle =
    size === 'sm'
      ? { minHeight: 40, paddingHorizontal: 12 }
      : size === 'lg'
        ? { minHeight: 50, paddingHorizontal: 20 }
        : size === 'icon'
          ? { width: 44, height: 44, paddingHorizontal: 0 }
          : { minHeight: 44, paddingHorizontal: 16 };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.buttonBase,
        heightStyle,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {leftIcon}
          {title ? (
            <Text
              numberOfLines={1}
              style={[
                styles.buttonText,
                size === 'lg' && styles.buttonTextLg,
                size === 'sm' && styles.buttonTextSm,
                { color: textColor },
              ]}
            >
              {title}
            </Text>
          ) : (
            children
          )}
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

export function AppCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
    </Text>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={styles.fieldError}>
      {message}
    </Text>
  );
}

export function AppInput({
  style,
  multiline,
  hasError,
  ...props
}: TextInputProps & { hasError?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={colors.ink500}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        styles.input,
        multiline && styles.textarea,
        hasError && styles.inputError,
        style,
      ]}
      {...props}
    />
  );
}

export function AppSkeleton({
  height = 16,
  width = '100%',
  borderRadius = radius.md,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius,
          backgroundColor: colors.ink200,
        },
        style,
      ]}
    />
  );
}

export function AppProgress({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar">
      <View style={[styles.progressFill, { width: `${clamped}%` }]} />
    </View>
  );
}

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  subtitle?: string;
};

export function SelectField<T extends string = string>({
  label,
  value,
  options,
  placeholder = 'Pilih opsi',
  onChange,
  hasError,
  modalTitle,
}: {
  label?: string;
  value?: T | '';
  options: readonly SelectOption<T>[];
  placeholder?: string;
  onChange: (value: T) => void;
  hasError?: boolean;
  modalTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);

  return (
    <View>
      {label ? <AppLabel>{label}</AppLabel> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.selectTrigger, hasError && styles.inputError]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.selectTriggerText,
            !selected && { color: colors.ink500 },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.ink600} />
      </Pressable>

      <BottomSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        title={modalTitle ?? label ?? placeholder}
      >
        <ScrollView style={styles.selectList}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={[
                  styles.selectRow,
                  isSelected && styles.selectRowActive,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.selectRowLabel,
                      isSelected && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.subtitle ? (
                    <Text style={styles.selectRowSubtitle}>{option.subtitle}</Text>
                  ) : null}
                </View>
                {isSelected ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}

export function CheckboxOption({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.checkboxRow, checked && styles.checkboxRowChecked]}
    >
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.checkboxLabel}>{label}</Text>
        {description ? (
          <Text style={styles.checkboxDesc}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.tabsList}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tabTrigger, active && styles.tabTriggerActive]}
          >
            <Text
              numberOfLines={1}
              style={[styles.tabLabel, active && styles.tabLabelActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BottomSheetModal({
  visible,
  onClose,
  title,
  description,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable style={styles.modalOverlayTap} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          {title ? (
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                {description ? (
                  <Text style={styles.sheetDescription}>{description}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityLabel="Tutup"
                style={styles.sheetClose}
              >
                <X size={20} color={colors.ink700} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ScreenScrollView({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextLg: {
    fontSize: 15,
  },
  buttonTextSm: {
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadowCard,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  fieldError: {
    fontSize: 12,
    color: colors.destructive,
    marginTop: 5,
    lineHeight: 16,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
  },
  textarea: {
    minHeight: 92,
    paddingTop: 10,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.ink200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  selectTrigger: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  selectList: {
    maxHeight: 340,
  },
  selectRow: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectRowActive: {
    backgroundColor: colors.secondary,
  },
  selectRowLabel: {
    fontSize: 14,
    color: colors.foreground,
  },
  selectRowSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  checkboxRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  checkboxRowChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.leaf50,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxBoxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  checkboxDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
    lineHeight: 17,
  },
  tabsList: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  tabTrigger: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabTriggerActive: {
    backgroundColor: colors.card,
    ...shadowCard,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    color: colors.foreground,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 18, 0.45)',
  },
  modalOverlayTap: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink300,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  sheetDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
    lineHeight: 18,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
});
