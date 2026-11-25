import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react-native';
import { colors, radius, shadowRaised } from '@/theme/tokens';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      idRef.current += 1;
      setToast({ id: idRef.current, variant, message });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(hide, 3_600);
    },
    [hide, opacity],
  );

  const value: ToastContextValue = {
    show,
    success: useCallback((msg: string) => show(msg, 'success'), [show]),
    error: useCallback((msg: string) => show(msg, 'error'), [show]),
    info: useCallback((msg: string) => show(msg, 'info'), [show]),
  };

  const palette =
    toast?.variant === 'success'
      ? {
          bg: colors.leaf50,
          border: colors.leaf300,
          text: colors.leaf900,
          iconColor: colors.primary,
          Icon: CheckCircle2,
        }
      : toast?.variant === 'error'
        ? {
            bg: colors.destructiveSoft,
            border: colors.destructiveBorder,
            text: colors.destructive,
            iconColor: colors.destructive,
            Icon: XCircle,
          }
        : {
            bg: colors.card,
            border: colors.border,
            text: colors.foreground,
            iconColor: colors.inProgress,
            Icon: Info,
          };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.container,
            { top: insets.top + 12, opacity },
          ]}
        >
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[
              styles.card,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
              },
            ]}
          >
            <palette.Icon size={18} color={palette.iconColor} />
            <Text style={[styles.text, { color: palette.text }]}>
              {toast.message}
            </Text>
            <Pressable
              onPress={hide}
              hitSlop={10}
              accessibilityLabel="Tutup notifikasi"
              style={styles.closeBtn}
            >
              <X size={16} color={palette.text} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadowRaised,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
});
