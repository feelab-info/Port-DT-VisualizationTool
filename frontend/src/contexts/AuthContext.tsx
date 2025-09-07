'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '@/services/AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, name: string, password: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    requiresVerification?: boolean;
    nextStep?: string;
  }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth service and check if user is authenticated on app startup
  useEffect(() => {
    const initAuth = async () => {
      // Initialize auth service (sets up interceptors)
      authService.initialize();
      
      const token = authService.getToken();
      if (token) {
        try {
          const isValid = await authService.validateToken();
          if (isValid) {
            const userData = authService.getCurrentUser();
            setUser(userData);
          } else {
            authService.logout();
          }
        } catch (error) {
          console.error('Error validating token:', error);
          authService.logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, name: string, password: string): Promise<{ 
    success: boolean; 
    error?: string; 
    requiresVerification?: boolean;
    nextStep?: string;
  }> => {
    try {
      console.log('[AuthContext] Starting login process');
      setIsLoading(true);
      
      const result = await authService.login(email, name, password).catch((serviceError) => {
        console.error('[AuthContext] AuthService.login threw error:', serviceError);
        return {
          success: false,
          error: 'Network error. Please try again.',
          requiresVerification: false,
          nextStep: undefined,
          user: undefined,
        };
      });
      
      console.log('[AuthContext] AuthService result:', result);
      
      if (result.success) {
        console.log('[AuthContext] Login successful, setting user');
        setUser(result.user!);
        return { success: true };
      } else {
        console.log('[AuthContext] Login failed, returning error');
        return { 
          success: false, 
          error: result.error,
          requiresVerification: result.requiresVerification,
          nextStep: result.nextStep,
        };
      }
    } catch (error) {
      console.error('[AuthContext] Unexpected error in login:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    } finally {
      console.log('[AuthContext] Setting loading to false');
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const result = await authService.refreshToken();
      if (result.success) {
        setUser(result.user!);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 