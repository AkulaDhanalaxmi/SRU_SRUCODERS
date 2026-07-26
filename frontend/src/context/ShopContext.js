import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const { user, refreshUser } = useAuth();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (user) {
      setWishlist(user.wishlist || []);
      api.get("/me/cart").then(({ data }) => setCart(data)).catch(() => {});
    } else {
      setCart([]); setWishlist([]);
    }
  }, [user]);

  const toggleWishlist = useCallback(async (pid) => {
    const { data } = await api.post(`/me/wishlist/${pid}`);
    setWishlist((w) => (data.wishlisted ? [...w, pid] : w.filter((x) => x !== pid)));
    toast(data.wishlisted ? "Added to wishlist" : "Removed from wishlist");
    return data.wishlisted;
  }, []);

  const addToCart = useCallback(async (pid, size, qty = 1) => {
    await api.post("/me/cart", { product_id: pid, size, qty });
    const { data } = await api.get("/me/cart");
    setCart(data);
  }, []);

  const removeFromCart = useCallback(async (pid, size) => {
    await api.delete(`/me/cart/${pid}`, { params: size ? { size } : {} });
    const { data } = await api.get("/me/cart");
    setCart(data);
  }, []);

  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <ShopContext.Provider value={{ cart, wishlist, cartCount, toggleWishlist, addToCart, removeFromCart, clearCart, refreshUser }}>
      {children}
    </ShopContext.Provider>
  );
}

export const useShop = () => useContext(ShopContext);
