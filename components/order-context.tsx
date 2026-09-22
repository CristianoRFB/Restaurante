'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readOrderCart, writeOrderCart } from '@/lib/order-repository';
import type { CartItemDraft } from '@/shared/order-domain';

interface OrderContextValue {
  items: CartItemDraft[];
  itemCount: number;
  addItem: (item: CartItemDraft) => void;
  updateItem: (item: CartItemDraft) => void;
  removeItem: (cartItemId: string) => void;
  clear: () => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemDraft[]>([]);
  useEffect(() => setItems(readOrderCart()), []);
  useEffect(() => { if (items.length || typeof window !== 'undefined') writeOrderCart(items); }, [items]);
  const value = useMemo<OrderContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    addItem: (item) => setItems((current) => [...current, item].slice(0, 30)),
    updateItem: (item) => setItems((current) => current.map((candidate) => candidate.cartItemId === item.cartItemId ? item : candidate)),
    removeItem: (cartItemId) => setItems((current) => current.filter((item) => item.cartItemId !== cartItemId)),
    clear: () => setItems([]),
  }), [items]);
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrderCart(): OrderContextValue {
  const value = useContext(OrderContext);
  if (!value) throw new Error('useOrderCart precisa estar dentro de OrderProvider.');
  return value;
}
