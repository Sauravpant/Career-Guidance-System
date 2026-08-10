import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import type { UserProfile, LoginCredentials, RegisterCredentials } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<any>;
  register: (credentials: RegisterCredentials) => Promise<any>;
  logout: () => void;
  error: Error | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [localUser, setLocalUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('careerpath_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authError, setAuthError] = useState<Error | null>(null);

  // Fetch the logged-in user details if cached/stored
  const { data: user, isLoading, isError, refetch } = useQuery<UserProfile | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const u = await userService.getMe();
        localStorage.setItem('careerpath_user', JSON.stringify(u));
        setLocalUser(u);
        return u;
      } catch (err) {
        localStorage.removeItem('careerpath_user');
        setLocalUser(null);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (userData) => {
      localStorage.setItem('careerpath_user', JSON.stringify(userData));
      setLocalUser(userData);
      queryClient.setQueryData(['me'], userData);
      setAuthError(null);
      // Invalidate dashboard stats
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      setAuthError(err);
    },
  });

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      setAuthError(null);
    },
    onError: (err: any) => {
      setAuthError(err);
    },
  });

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      localStorage.removeItem('careerpath_user');
      setLocalUser(null);
      queryClient.setQueryData(['me'], null);
      // Remove all queries except 'me' to avoid triggering refetch loop on 'me'
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'me',
      });
    },
  });

  // Event listener for token expiration
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('careerpath_user');
      setLocalUser(null);
      queryClient.setQueryData(['me'], null);
      // Remove all queries except 'me' to avoid triggering refetch loop on 'me'
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'me',
      });
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [queryClient]);

  const login = async (credentials: LoginCredentials) => {
    return loginMutation.mutateAsync(credentials);
  };

  const register = async (credentials: RegisterCredentials) => {
    return registerMutation.mutateAsync(credentials);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const clearError = () => setAuthError(null);

  const value = {
    user: localUser || user || null,
    isLoading: isLoading && !localUser,
    isAuthenticated: !!(localUser || user),
    login,
    register,
    logout,
    error: authError,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
