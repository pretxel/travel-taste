import React from 'react';
import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: 'Admin · Postmaster',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="postal-corner relative min-h-screen overflow-hidden">
      <div className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-10 sm:mb-14">
          <div className="flex items-baseline justify-between gap-6">
            <p className="label-mono text-muted-foreground">No. 02 · Postmaster&apos;s Desk</p>
            <p className="telegram hidden sm:block">{today}</p>
          </div>

          <h1 className="display mt-3 text-5xl leading-[0.92] sm:text-6xl">
            Edition
            <span className="display-italic text-primary"> Office</span>
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <span className="hand-rule" aria-hidden />
            <p className="text-sm italic text-muted-foreground">
              Curate dispatches. Mint keys. Keep the ledger.
            </p>
          </div>
        </header>

        <AdminNav />

        <main className="mt-8 sm:mt-10">{children}</main>

        <footer className="mt-20 border-t border-dashed pt-6">
          <div className="flex items-center justify-between">
            <p className="label-mono text-muted-foreground">Travel &amp; Taste · Private Edition</p>
            <p className="telegram">filed {today}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
