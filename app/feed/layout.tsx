import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diary',
  robots: { index: false, follow: false, nocache: true },
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
