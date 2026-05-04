'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/admin', label: 'Dispatches', index: 'I' },
  { href: '/admin/new', label: 'Compose', index: 'II' },
  { href: '/admin/codes', label: 'Keys', index: 'III' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="paper-card flex flex-wrap items-stretch justify-between rounded-sm"
    >
      <ul className="flex flex-1 flex-wrap divide-x divide-dashed divide-border">
        {tabs.map(t => {
          const active = t.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(t.href);
          return (
            <li key={t.href} className="flex">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 px-5 py-4 transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn('index-numeral text-2xl leading-none', !active && 'opacity-40')}
                  aria-hidden
                >
                  {t.index}
                </span>
                <span className="label-mono">{t.label}</span>
                {active && (
                  <span aria-hidden className="absolute inset-x-4 -bottom-px h-[2px] bg-primary" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4 border-t border-dashed border-border px-5 py-3 sm:border-l sm:border-t-0">
        <span aria-hidden className="hidden sm:block">
          <Monogram />
        </span>
        <button
          type="button"
          className="label-mono ink-press text-muted-foreground transition-colors hover:text-primary"
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/admin/login';
          }}
        >
          Lock&nbsp;up
        </button>
      </div>
    </nav>
  );
}

function Monogram() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      className="text-primary"
      aria-hidden
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontFamily="serif"
        fontStyle="italic"
        fontSize="14"
        fill="currentColor"
      >
        T&amp;T
      </text>
    </svg>
  );
}
