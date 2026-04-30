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
      setErr(j.error ?? 'Too many attempts');
      return;
    }
    setErr('Invalid password');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="owner-pwd">Owner password</Label>
        <Input
          id="owner-pwd"
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      <Button type="submit" disabled={busy || !pwd}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
