'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { PhotoSection } from '@/components/gallery/photo-section';
import { SESSION_KEY } from '@/lib/constants';
import { SECTIONS } from '@/lib/photos.generated';

export default function Home() {
  const [hasSession, setHasSession] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const session = window.localStorage.getItem(SESSION_KEY);
      setHasSession(session === 'authenticated');
    }
  }, []);

  if (!mounted) return null;

  if (!hasSession) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Travel Taste</h1>
            <p className="text-sm text-muted-foreground">
              Enter your password to access the dashboard
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-12">
      <div className="text-center">
        <p className="text-muted-foreground">Discover amazing destinations around the world</p>
      </div>
      {SECTIONS.length === 0 ? (
        <p className="text-center text-muted-foreground">No photos yet.</p>
      ) : (
        SECTIONS.map(section => <PhotoSection key={section.slug} {...section} />)
      )}
    </div>
  );
}
