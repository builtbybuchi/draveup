import React, { createContext, useContext, useState, useEffect } from 'react';

export type CartItemType = 'domain' | 'email' | 'transfer';

export interface CartItem {
  id: string;
  type: CartItemType;
  name: string;
  description: string;
  priceUsd: number; // annual USD price (display only — server re-prices)
  period: number; // years
  qty: number;
  /** Required for `type === 'email'` — server uses this to look up the plan price. */
  planKey?: string;
  /** Required for `type === 'transfer'` — EPP/auth code for the domain. */
  authCode?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotalUsd: number;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('drave-cart');
    if (stored) { try { setItems(JSON.parse(stored)); } catch {} }
  }, []);

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('drave-cart', JSON.stringify(newItems));
  };

  const addItem = (item: Omit<CartItem, 'id' | 'qty'>) => {
    const id = item.type + '_' + item.name.replace(/[^a-z0-9]/gi, '_');
    setItems(prev => {
      const existing = prev.find(i => i.id === id);
      const next = existing
        ? prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...item, id, qty: 1 }];
      localStorage.setItem('drave-cart', JSON.stringify(next));
      return next;
    });
    setCartOpen(true);
  };

  const removeItem = (id: string) => save(items.filter(i => i.id !== id));

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) { removeItem(id); return; }
    save(items.map(i => i.id === id ? { ...i, qty } : i));
  };

  const clearCart = () => save([]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.period * i.qty, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      totalItems, subtotalUsd,
      cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
