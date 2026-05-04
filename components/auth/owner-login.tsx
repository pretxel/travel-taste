'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function OwnerLogin() {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = '/admin';
      return;
    }
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Too many attempts. Try later.');
      return;
    }
    setErr('That key does not fit this door.');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="owner-pwd" className="label-mono text-muted-foreground">
          Owner key
        </Label>
        <Input
          id="owner-pwd"
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          placeholder="••••••••"
          className="rounded-sm tracking-widest"
          required
          autoFocus
        />
        {err && (
          <p role="alert" className="telegram text-destructive">
            ✕ {err}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={busy || !pwd}
        className="ink-press btn-stamp w-full rounded-sm"
      >
        {busy ? 'Turning the lock…' : 'Unlock the office'}
      </Button>
    </form>
  );
}
