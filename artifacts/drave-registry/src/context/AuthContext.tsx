import React, { createContext, useContext, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { useLocation } from 'wouter';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  balance: number;
  createdAt: string;
  twoFaEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  loginModalOpen: boolean;
  openLoginModal: (redirect?: string) => void;
  closeLoginModal: () => void;
  loginRedirect: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapClerkUser(clerkUser: ReturnType<typeof useUser>['user']): User | null {
  if (!clerkUser) return null;
  return {
    id: clerkUser.id,
    username:
      clerkUser.username ||
      clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      '',
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    imageUrl: clerkUser.imageUrl,
    balance: 0,
    createdAt: clerkUser.createdAt
      ? new Date(clerkUser.createdAt).toISOString().split('T')[0]
      : '',
    twoFaEnabled: clerkUser.twoFactorEnabled || false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  const user = mapClerkUser(clerkUser);
  const isAuthenticated = !!isSignedIn;

  const openLoginModal = useCallback((redirect?: string) => {
    navigate('/sign-in');
  }, [navigate]);

  const closeLoginModal = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const login = async (_email: string, _password: string) => {
    navigate('/sign-in');
  };

  const register = async (_data: { username: string; email: string; password: string; firstName: string; lastName: string }) => {
    navigate('/sign-up');
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      register,
      logout,
      loginModalOpen: false,
      openLoginModal,
      closeLoginModal,
      loginRedirect: null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
