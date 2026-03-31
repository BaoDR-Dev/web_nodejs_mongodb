import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [token, setToken]     = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login(credentials);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin    = user?.role === 'Admin';
  const isManager  = user?.role === 'Manager';
  const isStaff    = user?.role === 'Staff';
  const isCustomer = user?.role === 'Customer';
  const isAdminOrManager = isAdmin || isManager;
  const isStaffUp  = isAdmin || isManager || isStaff;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isManager, isStaff, isCustomer, isAdminOrManager, isStaffUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
