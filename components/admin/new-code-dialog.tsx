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
      toast.error('Could not create code');
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
        <Button>+ New code</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{createdCode ? 'Code created' : 'New code'}</DialogTitle>
        </DialogHeader>
        {!createdCode ? (
          <div className="grid gap-3">
            <Label htmlFor="label">Label (e.g. Mom, Sister)</Label>
            <Input id="label" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Save this code now. It will not be shown again.</p>
            <code className="block rounded bg-muted p-3 text-center text-lg tracking-widest">
              {createdCode}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(createdCode);
                toast.success('Copied');
              }}
            >
              Copy to clipboard
            </Button>
          </div>
        )}
        <DialogFooter>
          {!createdCode ? (
            <Button onClick={create} disabled={busy || !label.trim()}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          ) : (
            <Button onClick={reset}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
