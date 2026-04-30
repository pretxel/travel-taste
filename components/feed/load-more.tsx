'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PostTile } from './post-tile';

interface FeedPost {
  id: string;
  signed_url: string;
  caption: string | null;
  width: number;
  height: number;
  taken_at: string | null;
  created_at: string;
}

export function LoadMore({ initialCursor }: { initialCursor: string | null }) {
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [more, setMore] = useState<FeedPost[]>([]);
  const [busy, setBusy] = useState(false);

  if (!cursor && more.length === 0) return null;

  async function load() {
    if (!cursor) return;
    setBusy(true);
    const r = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
    const j = await r.json();
    setMore(prev => [...prev, ...((j.posts ?? []) as FeedPost[])]);
    setCursor((j.next_cursor ?? null) as string | null);
    setBusy(false);
  }

  return (
    <>
      {more.map(p => (
        <PostTile
          key={p.id}
          id={p.id}
          url={p.signed_url}
          caption={p.caption}
          width={p.width}
          height={p.height}
          takenAt={p.taken_at}
          createdAt={p.created_at}
        />
      ))}
      {cursor && (
        <div className="col-span-full flex justify-center pt-2">
          <Button onClick={load} disabled={busy}>
            {busy ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}
