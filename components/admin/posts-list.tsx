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
    if (!confirm('Delete this post?')) return;
    const r = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Deleted');
      load();
    } else {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Posts</h2>
        <Link href="/admin/new">
          <Button>+ New post</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map(p => (
            <li key={p.id} className="flex items-center gap-3 border-b py-2">
              <img src={p.signed_url} alt="" className="h-16 w-16 rounded object-cover" />
              <div className="flex-1 text-sm">
                <p className="line-clamp-2">{p.caption ?? <em>No caption</em>}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(p.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
