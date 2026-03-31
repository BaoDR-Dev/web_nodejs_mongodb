import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../api/services';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isCustomer, user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const fetchCount = async () => {
    if (!isCustomer || !user) return;
    try {
      const { data } = await cartAPI.count();
      setCartCount(data.count || 0);
    } catch { setCartCount(0); }
  };

  useEffect(() => { fetchCount(); }, [isCustomer, user]);

  return (
    <CartContext.Provider value={{ cartCount, setCartCount, fetchCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
