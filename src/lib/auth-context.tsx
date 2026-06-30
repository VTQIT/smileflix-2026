// src/lib/auth-context.tsx

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  CurrentUser, 
  getCurrentUser, 
  setCurrentUser, 
  validateUser,
  validateUserAsync,
  getCurrentUserAsync,
  setUseApi,
  checkApiAvailability
} from "./cms-storage";

interface AuthCtx {
  user: CurrentUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if API is available
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable) {
          setUseApi(true);
          // Try to get user from API
          const apiUser = await getCurrentUserAsync();
          if (apiUser) {
            setUser(apiUser);
            setLoading(false);
            return;
          }
        }
        
        // Fallback to localStorage
        const localUser = getCurrentUser();
        setUser(localUser);
      } catch (error) {
        console.error('Error loading user:', error);
        // Fallback to localStorage
        const localUser = getCurrentUser();
        setUser(localUser);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try API first
      const apiUser = await validateUserAsync(email, password);
      if (apiUser) {
        const currentUser: CurrentUser = {
          id: apiUser.id,
          email: apiUser.email,
          role: apiUser.role,
        };
        setCurrentUser(currentUser);
        setUser(currentUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin: user?.role === "admin",
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};