'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    setErr('That code does not match.');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="code" className="label-mono text-muted-foreground">
          Your code
        </Label>
        <input
          id="code"
          aria-label="Your code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
          placeholder="XXXXX-XXXXX"
          required
          className="font-mono w-full border-0 border-b border-foreground/40 bg-transparent px-0 py-3 text-center text-2xl tracking-[0.4em] text-foreground caret-primary placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-0"
        />
        {err && <p className="text-center text-sm italic text-destructive">{err}</p>}
      </div>
      <Button
        type="submit"
        disabled={busy || !code}
        className="ink-press h-11 w-full rounded-sm bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
      >
        <span className="label-mono">{busy ? 'Stamping…' : 'Open the Letter'}</span>
      </Button>
    </form>
  );
}
