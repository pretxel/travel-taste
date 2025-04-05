/* eslint-disable no-undef */
'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import { SESSION_KEY } from '@/lib/constants';
import { useEffect, useState } from 'react';

interface NavigationProps {
  onLogout: () => void;
  themeToggle: ReactNode;
}

export default function Navigation({ onLogout, themeToggle }: NavigationProps) {
  const [hasSession, setHasSession] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const session = window.localStorage.getItem(SESSION_KEY);
      setHasSession(session === 'authenticated');
    }
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="fixed left-1/2 top-4 -translate-x-1/2">
          <h1 className="text-2xl font-bold">Travel and Taste</h1>
        </div>
        <div className="flex items-center space-x-4 ml-auto">
          {themeToggle}
          {hasSession && (
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
