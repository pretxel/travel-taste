/* eslint-disable no-undef */
'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import Navigation from '@/components/navigation';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SESSION_KEY } from '@/lib/constants';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

  if (!mounted) {
    return null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <Navigation onLogout={handleLogout} themeToggle={<ThemeToggle />} />
            <main className="relative z-[100] pb-20 md:pb-0 md:pt-20">{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
