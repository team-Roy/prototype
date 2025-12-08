'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const store = useAuthStore();
  return store;
}

export function useRequireAuth(redirectTo = '/login') {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
    }
  }, [isInitialized, isLoading, isAuthenticated, router, pathname, redirectTo]);

  return {
    isAuthenticated,
    isLoading: !isInitialized || isLoading,
  };
}

export function useRedirectIfAuthenticated(redirectTo = '/') {
  const router = useRouter();
  const { isAuthenticated, isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isLoading, isAuthenticated, router, redirectTo]);

  return {
    isLoading: !isInitialized || isLoading,
  };
}
