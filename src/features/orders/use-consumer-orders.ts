import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth } from '@/contexts/auth-context';

export type ConsumerOrderSummary = FunctionReturnType<
  typeof api.orders.listMine
>[number];

export type ConsumerOrderDetail = NonNullable<
  FunctionReturnType<typeof api.orders.get>
>;

export function useMyOrders() {
  const { sessionToken } = useAuth();
  return useQuery(
    api.orders.listMine,
    sessionToken ? { sessionToken } : 'skip',
  );
}

export function useMyOrder(orderId: string | undefined) {
  const { sessionToken } = useAuth();
  return useQuery(
    api.orders.get,
    orderId && sessionToken
      ? { orderId: orderId as Id<'orders'>, sessionToken }
      : 'skip',
  );
}

export function useCancelReservation() {
  const { sessionToken } = useAuth();
  const cancel = useMutation(api.orders.cancelReservation);
  return (orderId: Id<'orders'>) =>
    cancel({ orderId, sessionToken: sessionToken ?? undefined });
}
