'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  // Wait for Zustand to rehydrate from localStorage before making any redirect decisions
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, allowedRoles, router, hydrated]);

  // Render nothing while store is rehydrating — avoids flash-redirect to /login
  if (!hydrated) return null;
  if (!isAuthenticated) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
