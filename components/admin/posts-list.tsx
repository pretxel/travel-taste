'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PostRow {
  id: string;
  caption: string | null;
  created_at: string;
  signed_url: string;
}

export function PostsList() {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/posts');
    const j = await r.json();
    setRows(j.posts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function del(id: string) {
    if (!confirm('Pull this dispatch from the edition?')) return;
    const r = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Pulled from edition');
      load();
    } else {
      toast.error('Could not pull');
    }
  }

  const total = rows.length;

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-muted-foreground">Section I</p>
          <h2 className="display mt-1 text-3xl">
            Contact <span className="display-italic">sheet</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? 'Pulling proofs from the darkroom…'
              : total === 0
                ? 'No proofs yet — develop your first postcard.'
                : `${total} ${total === 1 ? 'postcard' : 'postcards'} on file.`}
          </p>
        </div>
        <Link href="/admin/new" className="btn-stamp">
          <Button className="ink-press rounded-sm">+ Compose dispatch</Button>
        </Link>
      </header>

      <div className="postal-rule" aria-hidden />

      {loading ? (
        <ContactSheetSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p, i) => (
            <li
              key={p.id}
              className="ledger-in paper-card relative flex flex-col gap-3 rounded-none p-4 sm:p-5"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <span aria-hidden className="index-numeral absolute right-3 top-2 text-2xl">
                №&thinsp;{String(i + 1).padStart(2, '0')}
              </span>

              <div className="filmstrip overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.signed_url}
                  alt={p.caption ?? 'Untitled dispatch'}
                  className="block aspect-[4/3] w-full rounded-sm object-cover"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 space-y-2 pr-10">
                <p className="text-base leading-snug">
                  {p.caption ?? (
                    <span className="display-italic text-muted-foreground">Untitled</span>
                  )}
                </p>
                <p className="telegram">
                  filed&nbsp;·&nbsp;
                  {new Date(p.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="wax-seal text-primary">Posted</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => del(p.id)}
                  className="label-mono text-muted-foreground hover:text-destructive"
                >
                  Pull
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContactSheetSkeleton() {
  return (
    <ul className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="paper-card flex flex-col gap-3 p-5">
          <div className="aspect-[4/3] w-full animate-pulse bg-muted/60" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted/60" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="paper-card flex flex-col items-center gap-3 rounded-sm py-14 text-center">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden
        className="text-primary/70"
      >
        <rect x="6" y="14" width="44" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 16 L28 32 L50 16" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="28" cy="30" r="3" fill="currentColor" opacity="0.6" />
      </svg>
      <p className="display-italic text-xl">An empty mailbag.</p>
      <p className="text-sm text-muted-foreground">
        Compose your first dispatch to begin the edition.
      </p>
      <Link href="/admin/new" className="mt-2">
        <Button className="ink-press rounded-sm">+ Compose dispatch</Button>
      </Link>
    </div>
  );
}
