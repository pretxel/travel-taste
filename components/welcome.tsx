'use client';

import { LoginForm } from '@/components/auth/login-form';

export default function Welcome() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
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
