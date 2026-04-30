'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/admin', label: 'Posts' },
  { href: '/admin/codes', label: 'Codes' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center justify-between border-b p-4">
      <div className="flex gap-4">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'text-sm',
              pathname === t.href ? 'font-semibold' : 'text-muted-foreground'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={async () => {
          await fetch('/api/admin/logout', { method: 'POST' });
          window.location.href = '/admin/login';
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
