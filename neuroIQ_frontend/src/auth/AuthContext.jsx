import { createContext, useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import { getUser } from '../api/auth.api';

export const AuthContext = createContext(null);

/**
 * Decode JWT token payload
 */
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

      if (storedToken && !isTokenExpired(storedToken)) {
        setToken(storedToken);
        if (storedRefreshToken) {
          setRefreshToken(storedRefreshToken);
        }
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          // Fetch user data if not cached
          try {
            const userData = await getUser();
            setUser(userData);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            setIsAuthenticated(true);
          } catch {
            // Token invalid, clear storage
            logout();
          }
        }
      } else if (storedToken) {
        // Token expired, clear storage
        logout();
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback((authToken, authRefreshToken, userData) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authRefreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setToken(authToken);
    setRefreshToken(authRefreshToken);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback((updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    setUser(newUser);
  }, [user]);

  const value = {
    user,
    token,
    refreshToken,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
