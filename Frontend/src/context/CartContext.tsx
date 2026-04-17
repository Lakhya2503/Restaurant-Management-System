import React, { createContext, useCallback, useContext, useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize cart from localStorage if available
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem("restaurant-cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Save cart to localStorage whenever it changes
  const saveCartToStorage = (cartItems: CartItem[]) => {
    try {
      localStorage.setItem("restaurant-cart", JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  };

  const addItem = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      let newItems;
      if (existing) {
        newItems = prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      } else {
        newItems = [...prev, { ...item, qty: 1 }];
      }
      saveCartToStorage(newItems);
      return newItems;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const newItems = prev.filter((i) => i.id !== id);
      saveCartToStorage(newItems);
      return newItems;
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) => {
      let newItems;
      if (qty <= 0) {
        newItems = prev.filter((i) => i.id !== id);
      } else {
        newItems = prev.map((i) => (i.id === id ? { ...i, qty } : i));
      }
      saveCartToStorage(newItems);
      return newItems;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCartToStorage([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
