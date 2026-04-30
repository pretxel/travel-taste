'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function NewPostForm() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    const res = await fetch('/api/admin/posts', { method: 'POST', body: fd });
    setBusy(false);
    if (res.ok) {
      toast.success('Posted');
      window.location.href = '/admin';
      return;
    }
    const j = await res.json().catch(() => ({}));
    toast.error(j.error ?? 'Upload failed');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="file">Photo</Label>
        <input
          id="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cap">Caption</Label>
        <Textarea id="cap" value={caption} onChange={e => setCaption(e.target.value)} rows={3} />
      </div>
      <Button type="submit" disabled={busy || !file}>
        {busy ? 'Posting…' : 'Post'}
      </Button>
    </form>
  );
}
