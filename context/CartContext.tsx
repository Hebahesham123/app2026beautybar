"use client";

import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import type { Product, CartItem, ProductVariant } from "@/types";
import { useAuth } from "./AuthContext";

const CART_KEY = "ec_cart";

type CartContextType = {
  items: CartItem[];
  add: (product: Product, qty?: number, variant?: ProductVariant | null) => void;
  updateQty: (productId: string, qty: number, variantId?: string | null) => void;
  remove: (productId: string, variantId?: string | null) => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextType>(null!);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user } = useAuth();

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    if (typeof window !== "undefined") window.localStorage.setItem(CART_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CART_KEY) : null;
    if (raw) try {
      setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const add = useCallback(
    (product: Product, qty = 1, variant?: ProductVariant | null) => {
      setItems((prev) => {
        const variantId = variant?.id;
        const match = (x: CartItem) =>
          x.product_id === product.id && (x.variant_id ?? null) === (variantId ?? null);
        const i = prev.findIndex(match);
        const next = [...prev];
        const price =
          variant?.price != null ? Number(variant.price) : Number(product.price) || 0;
        const variantTitle =
          variant != null ? `${variant.title}: ${variant.value}` : undefined;
        if (i >= 0) {
          next[i] = {
            ...next[i],
            qty: next[i].qty + qty,
            price_snapshot: price,
            variant_id: variantId ?? undefined,
            variant_title: variantTitle ?? undefined,
          };
        } else {
          next.push({
            product_id: product.id,
            product,
            qty,
            price_snapshot: price,
            variant_id: variantId ?? undefined,
            variant_title: variantTitle ?? undefined,
          });
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const matchItem = useCallback((item: CartItem, productId: string, variantId?: string | null) => {
    if (item.product_id !== productId) return false;
    const a = item.variant_id ?? null;
    const b = variantId ?? null;
    return a === b;
  }, []);

  const updateQty = useCallback(
    (productId: string, qty: number, variantId?: string | null) => {
      setItems((prev) => {
        if (qty <= 0) {
          const next = prev.filter((x) => !matchItem(x, productId, variantId));
          persist(next);
          return next;
        }
        const next = prev.map((x) =>
          matchItem(x, productId, variantId) ? { ...x, qty } : x
        );
        persist(next);
        return next;
      });
    },
    [persist, matchItem]
  );

  const remove = useCallback(
    (productId: string, variantId?: string | null) => {
      setItems((prev) => {
        const next = prev.filter((x) => !matchItem(x, productId, variantId));
        persist(next);
        return next;
      });
    },
    [persist, matchItem]
  );

  const total = useMemo(() => items.reduce((s, i) => s + i.price_snapshot * i.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, add, updateQty, remove, total, count }),
    [items, add, updateQty, remove, total, count]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

export { CART_KEY };
