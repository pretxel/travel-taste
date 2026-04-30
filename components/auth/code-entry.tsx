'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CodeEntry() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/viewer/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = '/feed';
      return;
    }
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Too many attempts');
      return;
    }
    setErr('Invalid code');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="code">Your code</Label>
        <Input
          id="code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
          placeholder="XXXXX-XXXXX"
          required
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      <Button type="submit" disabled={busy || !code}>
        {busy ? 'Checking…' : 'Enter'}
      </Button>
    </form>
  );
}
