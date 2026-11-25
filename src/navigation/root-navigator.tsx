import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CircleUserRound,
  Compass,
  FileWarning,
  History,
  Home,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  PackageCheck,
  Recycle,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Wrench,
} from 'lucide-react-native';
import { AppLogo } from '@/components/common/app-logo';
import { PageLoader, UnreadBadge } from '@/components/common/common-chrome';
import { useAuth } from '@/contexts/auth-context';
import { useUnreadNotificationCount } from '@/features/notifications/use-unread-notifications';
import type {
  AdminTabParamList,
  ConsumerTabParamList,
  MerchantTabParamList,
  ProcessorTabParamList,
  RootStackParamList,
} from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

// Screens
import WelcomeScreen from '@/screens/public/welcome-screen';
import AboutScreen from '@/screens/public/about-screen';
import LoginScreen from '@/screens/auth/login-screen';
import RegisterScreen from '@/screens/auth/register-screen';
import RegisterFormScreen from '@/screens/auth/register-form-screen';
import OnboardingScreen from '@/screens/auth/onboarding-screen';
import PendingVerificationScreen from '@/screens/auth/pending-verification-screen';
import NotificationsScreen from '@/screens/notifications-screen';

import ConsumerHomeScreen from '@/screens/consumer/home-screen';
import ExploreScreen from '@/screens/consumer/explore-screen';
import CategoryScreen from '@/screens/consumer/category-screen';
import ConsumerMerchantScreen from '@/screens/consumer/merchant-screen';
import ItemDetailScreen from '@/screens/consumer/item-detail-screen';
import CheckoutScreen from '@/screens/consumer/checkout-screen';
import OrdersScreen from '@/screens/consumer/orders-screen';
import OrderDetailScreen from '@/screens/consumer/order-detail-screen';
import ConsumerImpactScreen from '@/screens/consumer/impact-screen';
import ConsumerProfileScreen from '@/screens/consumer/profile-screen';

import MerchantDashboardScreen from '@/screens/merchant/dashboard-screen';
import MerchantSurplusScreen from '@/screens/merchant/surplus-screen';
import CreateSurplusScreen from '@/screens/merchant/create-surplus-screen';
import SurplusDetailScreen from '@/screens/merchant/surplus-detail-screen';
import MerchantPickupScreen from '@/screens/merchant/pickup-screen';
import MerchantImpactScreen from '@/screens/merchant/impact-screen';

import ProcessorDashboardScreen from '@/screens/processor/dashboard-screen';
import ProcessorRecoveryScreen from '@/screens/processor/recovery-screen';
import RecoveryDetailScreen from '@/screens/processor/recovery-detail-screen';
import ProcessorHistoryScreen from '@/screens/processor/history-screen';
import ProcessorProfileScreen from '@/screens/processor/profile-screen';

import AdminDashboardScreen from '@/screens/admin/dashboard-screen';
import {
  AdminModerationScreen,
  AdminVerificationsScreen,
} from '@/screens/admin/review-queue-screen';
import AdminLedgerScreen from '@/screens/admin/ledger-screen';
import AdminOperationsScreen from '@/screens/admin/operations-screen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const ConsumerTab = createBottomTabNavigator<ConsumerTabParamList>();
const MerchantTab = createBottomTabNavigator<MerchantTabParamList>();
const ProcessorTab = createBottomTabNavigator<ProcessorTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.foreground,
    border: colors.border,
    primary: colors.primary,
  },
};

const sharedTabScreenOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.mutedForeground,
  tabBarStyle: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
};

function OperatorHeaderRight({ showBell = false }: { showBell?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const unreadCount = useUnreadNotificationCount();

  return (
    <View style={styles.headerRightRow}>
      {showBell ? (
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel="Notifikasi"
          style={styles.headerBtn}
        >
          <Bell size={19} color={colors.foreground} />
          {unreadCount > 0 ? (
            <View style={styles.headerBadge}>
              <UnreadBadge count={unreadCount} />
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => void logout()}
        accessibilityLabel="Keluar"
        style={styles.headerBtn}
      >
        <LogOut size={19} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

function OperatorHeaderLeft({ roleLabel }: { roleLabel: string }) {
  return (
    <View style={styles.headerLeftRow}>
      <AppLogo size={20} showWordmark={false} />
      <View style={styles.rolePill}>
        <Text style={styles.rolePillText}>{roleLabel}</Text>
      </View>
    </View>
  );
}

function ConsumerTabs() {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ConsumerTab.Navigator
      screenOptions={{
        ...sharedTabScreenOptions,
        headerShown: false,
      }}
    >
      <ConsumerTab.Screen
        name="ConsumerHome"
        component={ConsumerHomeScreen}
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <ConsumerTab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Jelajah',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      {isAuthenticated ? (
        <>
          <ConsumerTab.Screen
            name="Orders"
            component={OrdersScreen}
            options={{
              title: 'Pesanan',
              tabBarIcon: ({ color, size }) => (
                <ShoppingBag size={size} color={color} />
              ),
            }}
          />
          <ConsumerTab.Screen
            name="ConsumerImpact"
            component={ConsumerImpactScreen}
            options={{
              title: 'Dampak',
              tabBarIcon: ({ color, size }) => <Leaf size={size} color={color} />,
            }}
          />
          <ConsumerTab.Screen
            name="ConsumerProfile"
            component={ConsumerProfileScreen}
            options={{
              title: 'Profil',
              tabBarIcon: ({ color, size }) => (
                <CircleUserRound size={size} color={color} />
              ),
            }}
          />
        </>
      ) : (
        <ConsumerTab.Screen
          name="GuestLoginTab"
          component={LoginScreen}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Login');
            },
          }}
          options={{
            title: 'Masuk',
            tabBarIcon: ({ color, size }) => <LogIn size={size} color={color} />,
          }}
        />
      )}
    </ConsumerTab.Navigator>
  );
}

function MerchantTabs() {
  const unreadCount = useUnreadNotificationCount();

  return (
    <MerchantTab.Navigator
      screenOptions={{
        ...sharedTabScreenOptions,
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTitle: '',
        headerLeft: () => <OperatorHeaderLeft roleLabel="Merchant" />,
        headerRight: () => <OperatorHeaderRight />,
      }}
    >
      <MerchantTab.Screen
        name="MerchantDashboard"
        component={MerchantDashboardScreen}
        options={{
          title: 'Ringkasan',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <MerchantTab.Screen
        name="MerchantSurplus"
        component={MerchantSurplusScreen}
        options={{
          title: 'Surplus',
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
        }}
      />
      <MerchantTab.Screen
        name="MerchantPickup"
        component={MerchantPickupScreen}
        options={{
          title: 'Pickup',
          tabBarIcon: ({ color, size }) => (
            <PackageCheck size={size} color={color} />
          ),
        }}
      />
      <MerchantTab.Screen
        name="MerchantImpact"
        component={MerchantImpactScreen}
        options={{
          title: 'Dampak',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <MerchantTab.Screen
        name="MerchantNotifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifikasi',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
    </MerchantTab.Navigator>
  );
}

function ProcessorTabs() {
  const unreadCount = useUnreadNotificationCount();

  return (
    <ProcessorTab.Navigator
      screenOptions={{
        ...sharedTabScreenOptions,
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTitle: '',
        headerLeft: () => <OperatorHeaderLeft roleLabel="Organic Processor" />,
        headerRight: () => <OperatorHeaderRight />,
      }}
    >
      <ProcessorTab.Screen
        name="ProcessorDashboard"
        component={ProcessorDashboardScreen}
        options={{
          title: 'Ringkasan',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <ProcessorTab.Screen
        name="ProcessorRecovery"
        component={ProcessorRecoveryScreen}
        options={{
          title: 'Antrean',
          tabBarIcon: ({ color, size }) => <Recycle size={size} color={color} />,
        }}
      />
      <ProcessorTab.Screen
        name="ProcessorHistory"
        component={ProcessorHistoryScreen}
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
      />
      <ProcessorTab.Screen
        name="ProcessorProfile"
        component={ProcessorProfileScreen}
        options={{
          title: 'Kapasitas',
          tabBarIcon: ({ color, size }) => (
            <Settings2 size={size} color={color} />
          ),
        }}
      />
      <ProcessorTab.Screen
        name="ProcessorNotifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifikasi',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
    </ProcessorTab.Navigator>
  );
}

function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        ...sharedTabScreenOptions,
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTitle: '',
        headerLeft: () => <OperatorHeaderLeft roleLabel="Admin" />,
        headerRight: () => <OperatorHeaderRight showBell />,
      }}
    >
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Ringkasan',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminVerifications"
        component={AdminVerificationsScreen}
        options={{
          title: 'Verifikasi',
          tabBarIcon: ({ color, size }) => (
            <ShieldCheck size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminModeration"
        component={AdminModerationScreen}
        options={{
          title: 'Moderasi',
          tabBarIcon: ({ color, size }) => (
            <FileWarning size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminLedger"
        component={AdminLedgerScreen}
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color, size }) => (
            <BookOpenCheck size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminOperations"
        component={AdminOperationsScreen}
        options={{
          title: 'Operasi',
          tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} />,
        }}
      />
    </AdminTab.Navigator>
  );
}

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader label="Memuat sesi Cirquo..." />;
  }

  let initialRouteName: keyof RootStackParamList = 'ConsumerMain';
  let initialOnboardingRole: 'merchant' | 'processor' = 'merchant';

  if (user?.role === 'merchant') {
    if (!user.profile) {
      initialRouteName = 'Onboarding';
      initialOnboardingRole = 'merchant';
    } else if (user.profile.verificationStatus !== 'verified') {
      initialRouteName = 'PendingVerification';
    } else {
      initialRouteName = 'MerchantMain';
    }
  } else if (user?.role === 'processor') {
    if (!user.profile) {
      initialRouteName = 'Onboarding';
      initialOnboardingRole = 'processor';
    } else if (user.profile.verificationStatus !== 'verified') {
      initialRouteName = 'PendingVerification';
    } else {
      initialRouteName = 'ProcessorMain';
    }
  } else if (user?.role === 'admin') {
    initialRouteName = 'AdminMain';
  }

  const stackKey = `${user?.role ?? 'guest'}-${user?.profile?.verificationStatus ?? 'none'}`;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        key={stackKey}
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Consumer & Guest Screens */}
        <Stack.Screen
          name="ConsumerMain"
          component={ConsumerTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{ title: 'Tentang Cirquo' }}
        />
        <Stack.Screen
          name="Category"
          component={CategoryScreen}
          options={{ title: 'Kategori' }}
        />
        <Stack.Screen
          name="ConsumerMerchant"
          component={ConsumerMerchantScreen}
          options={{ title: 'Mitra Usaha' }}
        />
        <Stack.Screen
          name="ItemDetail"
          component={ItemDetailScreen}
          options={{ title: 'Detail Rescue Item' }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ title: 'Selesaikan Pembayaran' }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: 'Detail Pesanan' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifikasi' }}
        />

        {/* Auth & Onboarding */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Masuk' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Daftar' }}
        />
        <Stack.Screen
          name="RegisterForm"
          component={RegisterFormScreen}
          options={{ title: 'Buat Akun' }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          initialParams={{ role: initialOnboardingRole }}
          options={{ title: 'Lengkapi Profil' }}
        />
        <Stack.Screen
          name="PendingVerification"
          component={PendingVerificationScreen}
          options={{ title: 'Status Verifikasi' }}
        />

        {/* Merchant Shell + Sub-screens */}
        <Stack.Screen
          name="MerchantMain"
          component={MerchantTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateSurplus"
          component={CreateSurplusScreen}
          options={{ title: 'Buat Rescue Item' }}
        />
        <Stack.Screen
          name="SurplusDetail"
          component={SurplusDetailScreen}
          options={{ title: 'Detail Rescue Item' }}
        />

        {/* Processor Shell + Sub-screens */}
        <Stack.Screen
          name="ProcessorMain"
          component={ProcessorTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecoveryDetail"
          component={RecoveryDetailScreen}
          options={{ title: 'Detail Batch Recovery' }}
        />

        {/* Admin Shell */}
        <Stack.Screen
          name="AdminMain"
          component={AdminTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});
