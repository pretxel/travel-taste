'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import Navigation from '@/components/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SESSION_KEY } from '@/lib/constants';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    if (mounted) {
      globalThis?.localStorage?.removeItem(SESSION_KEY);
      if (mounted && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Prevent hydration mismatch by rendering nothing until mounted if absolutely necessary,
  // BUT we must not block html/body. Since this component will be INSIDE body, returning null here is "safe" for html/body existence,
  // but bad for UX (flash of content).
  // Next-themes handles hydration well usually.
  // The original code returned null for the WHOLE layout.
  // Let's try to render children immediately and let hydration happen,
  // or if we must match original behavior, we return null here (which results in empty body).
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="min-h-screen bg-background">
        <Navigation onLogout={handleLogout} themeToggle={<ThemeToggle />} />
        <main className="relative z-[100] pb-20 md:pb-0 md:pt-20">{children}</main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
