'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  github_username: string;
  email: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const localToken = localStorage.getItem('reviewpilot_token');
    if (localToken) {
      setToken(localToken);
      fetchUser(localToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token expired or invalid
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch authenticated user:', error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('reviewpilot_token');
    setToken(null);
    setUser(null);
    setIsLoading(false);
    router.push('/login');
  };

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isDashboardRoute = pathname?.startsWith('/dashboard');
      if (isDashboardRoute && !user) {
        router.push('/login');
      } else if (pathname === '/login' && user) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
