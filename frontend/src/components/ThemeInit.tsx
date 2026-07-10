'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function ThemeInit() {
  const initializeAuth = useAppStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return null;
}
