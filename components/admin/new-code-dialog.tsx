'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function NewCodeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const r = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    setBusy(false);
    if (!r.ok) {
      toast.error('Could not mint key');
      return;
    }
    const j = await r.json();
    setCreatedCode(j.code);
    onCreated();
  }

  function reset() {
    setOpen(false);
    setCreatedCode(null);
    setLabel('');
  }

  return (
    <Dialog open={open} onOpenChange={v => (v ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button className="ink-press btn-stamp rounded-sm">+ Mint key</Button>
      </DialogTrigger>

      <DialogContent className="rounded-sm border-dashed bg-popover sm:max-w-md">
        <DialogHeader className="text-left">
          <p className="label-mono text-muted-foreground">
            {createdCode ? 'Receipt' : 'New entry · keybook'}
          </p>
          <DialogTitle className="display text-2xl">
            {createdCode ? (
              <>
                Tear &amp; <span className="display-italic">hand over</span>
              </>
            ) : (
              <>
                Mint a <span className="display-italic">key</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {createdCode
              ? 'This code is shown only once. Copy it now — the keybook keeps a hash, not the code.'
              : 'Name the bearer so the ledger remembers who carries this key.'}
          </DialogDescription>
        </DialogHeader>

        {!createdCode ? (
          <div className="grid gap-3 py-2">
            <Label htmlFor="label" className="label-mono text-muted-foreground">
              Bearer
            </Label>
            <Input
              id="label"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Mom · Sister · Studio"
              className="rounded-sm"
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="perforated mx-auto w-full px-7 py-5 text-center">
              <p className="label-mono text-primary">One-time key</p>
              <p
                className="mt-2 font-mono text-2xl tracking-[0.4em]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {createdCode}
              </p>
              <p className="telegram mt-2">✦ &nbsp; not stored in plaintext &nbsp; ✦</p>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="ink-press w-full rounded-sm"
              onClick={() => {
                navigator.clipboard.writeText(createdCode);
                toast.success('Copied to clipboard');
              }}
            >
              Copy to clipboard
            </Button>
          </div>
        )}

        <DialogFooter>
          {!createdCode ? (
            <Button
              onClick={create}
              disabled={busy || !label.trim()}
              className="ink-press btn-stamp rounded-sm"
            >
              {busy ? 'Minting…' : 'Mint & seal'}
            </Button>
          ) : (
            <Button onClick={reset} className="ink-press rounded-sm">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
