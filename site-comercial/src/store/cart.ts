import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CatalogProduct } from '../data/catalog';

export interface CartItem {
  id: string;
  product: CatalogProduct;
  size: string;
  color: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: CatalogProduct, size: string, color: string, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotal: () => number;
  getItemsCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, size, color, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id && item.size === size && item.color === color
          );

          if (existingItem) {
            return {
              isOpen: true,
              items: state.items.map((item) =>
                item.id === existingItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            isOpen: true,
            items: [
              ...state.items,
              {
                id: `${product.id}-${size}-${color}-${Date.now()}`,
                product,
                size,
                color,
                quantity,
              },
            ],
          };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotal: () =>
        get().items.reduce((total, item) => total + item.product.price * item.quantity, 0),

      getItemsCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    {
      name: 'amoras-catalog-cart',
    }
  )
);
