import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MaterialType } from '@/lib/pricing';
import type { UserRole } from '@/types/domain';

export type ExploreParams = {
  q?: string;
  category?: MaterialType | 'all';
  distance?: '30000' | '2000' | '3000' | '5000';
  price?: 'all' | '15000' | '20000' | '30000';
  pickup?: 'all' | 'before_18' | 'after_18';
  dietary?: 'all' | 'Vegetarian' | 'Vegan' | 'Tanpa babi';
};

export type ConsumerTabParamList = {
  ConsumerHome: undefined;
  Explore: ExploreParams | undefined;
  Orders: undefined;
  ConsumerImpact: undefined;
  ConsumerProfile: undefined;
  GuestLoginTab: undefined;
};

export type MerchantTabParamList = {
  MerchantDashboard: undefined;
  MerchantSurplus: undefined;
  MerchantPickup: undefined;
  MerchantImpact: undefined;
  MerchantNotifications: undefined;
};

export type ProcessorTabParamList = {
  ProcessorDashboard: undefined;
  ProcessorRecovery: undefined;
  ProcessorHistory: undefined;
  ProcessorProfile: undefined;
  ProcessorNotifications: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminVerifications: undefined;
  AdminModeration: undefined;
  AdminLedger: undefined;
  AdminOperations: undefined;
  AdminNotifications: undefined;
};

export type RootStackParamList = {
  // Consumer / Guest shell
  ConsumerMain: NavigatorScreenParams<ConsumerTabParamList> | undefined;
  Welcome: undefined;
  About: undefined;
  Category: { categorySlug: string };
  ConsumerMerchant: { merchantId: string };
  ItemDetail: { id: string };
  Checkout: { orderId: string };
  OrderDetail: { id: string };
  Notifications: undefined;

  // Auth & Onboarding
  Login: { returnTo?: string; isAdmin?: boolean } | undefined;
  Register: undefined;
  RegisterForm: { role: 'consumer' | 'merchant' | 'processor' };
  Onboarding: { role: 'merchant' | 'processor' };
  PendingVerification: { profileSubmitted?: boolean } | undefined;

  // Merchant shell + sub-screens
  MerchantMain: NavigatorScreenParams<MerchantTabParamList> | undefined;
  CreateSurplus: undefined;
  SurplusDetail: { id: string };

  // Processor shell + sub-screens
  ProcessorMain: NavigatorScreenParams<ProcessorTabParamList> | undefined;
  RecoveryDetail: { id: string };

  // Admin shell
  AdminMain: NavigatorScreenParams<AdminTabParamList> | undefined;
};

export function parseHrefToRoute(
  href: string,
  role?: UserRole,
): { name: keyof RootStackParamList; params?: Record<string, unknown> } | null {
  const clean = href.split('?')[0].replace(/\/+$/, '') || '/';
  const orderMatch = clean.match(/^\/orders\/([^/]+)$/);
  if (orderMatch) return { name: 'OrderDetail', params: { id: orderMatch[1] } };
  const checkoutMatch = clean.match(/^\/checkout\/([^/]+)$/);
  if (checkoutMatch) return { name: 'Checkout', params: { orderId: checkoutMatch[1] } };
  const itemMatch = clean.match(/^\/item\/([^/]+)$/);
  if (itemMatch) return { name: 'ItemDetail', params: { id: itemMatch[1] } };
  const surplusMatch = clean.match(/^\/merchant\/surplus\/([^/]+)$/);
  if (surplusMatch) {
    if (surplusMatch[1] === 'new') return { name: 'CreateSurplus' };
    return { name: 'SurplusDetail', params: { id: surplusMatch[1] } };
  }
  const recoveryMatch = clean.match(/^\/processor\/recovery\/([^/]+)$/);
  if (recoveryMatch) {
    return { name: 'RecoveryDetail', params: { id: recoveryMatch[1] } };
  }
  if (clean === '/merchant/pickup') {
    return { name: 'MerchantMain', params: { screen: 'MerchantPickup' } };
  }
  if (clean === '/merchant/surplus') {
    return { name: 'MerchantMain', params: { screen: 'MerchantSurplus' } };
  }
  if (clean === '/merchant' || clean === '/merchant/impact') {
    return { name: 'MerchantMain', params: { screen: 'MerchantDashboard' } };
  }
  if (clean === '/processor/recovery') {
    return { name: 'ProcessorMain', params: { screen: 'ProcessorRecovery' } };
  }
  if (clean === '/processor/profile') {
    return { name: 'ProcessorMain', params: { screen: 'ProcessorProfile' } };
  }
  if (clean === '/processor') {
    return { name: 'ProcessorMain', params: { screen: 'ProcessorDashboard' } };
  }
  if (clean === '/admin/verifications') {
    return { name: 'AdminMain', params: { screen: 'AdminVerifications' } };
  }
  if (clean === '/admin/moderation') {
    return { name: 'AdminMain', params: { screen: 'AdminModeration' } };
  }
  if (clean === '/admin/ledger') {
    return { name: 'AdminMain', params: { screen: 'AdminLedger' } };
  }
  if (clean === '/admin/operations') {
    return { name: 'AdminMain', params: { screen: 'AdminOperations' } };
  }
  if (clean === '/admin') {
    return { name: 'AdminMain', params: { screen: 'AdminDashboard' } };
  }
  if (clean === '/pending-verification') {
    return { name: 'PendingVerification' };
  }
  if (clean === '/orders') {
    return { name: 'ConsumerMain', params: { screen: 'Orders' } };
  }
  if (clean === '/explore' || clean === '/discover') {
    return { name: 'ConsumerMain', params: { screen: 'Explore' } };
  }
  if (role === 'merchant') return { name: 'MerchantMain' };
  if (role === 'processor') return { name: 'ProcessorMain' };
  if (role === 'admin') return { name: 'AdminMain' };
  return { name: 'ConsumerMain' };
}
