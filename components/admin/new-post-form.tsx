'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function NewPostForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | null | undefined) {
    if (!f) return;
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(f.type);
    if (!ok && f.type !== '') {
      toast.error('Unsupported format. JPEG, PNG, WEBP or HEIC only.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('Too large. Max 20 MB.');
      return;
    }
    setFile(f);
  }

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
      toast.success('Stamped & posted');
      window.location.href = '/admin';
      return;
    }
    const j = await res.json().catch(() => ({}));
    toast.error(j.error ?? 'Could not post');
  }

  return (
    <section className="space-y-8">
      <header>
        <p className="label-mono text-muted-foreground">Section II</p>
        <h2 className="display mt-1 text-3xl">
          Compose a <span className="display-italic">dispatch</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Drop a frame, sign it with a few words, then stamp it for the edition.
        </p>
      </header>

      <div className="postal-rule" aria-hidden />

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Drop zone */}
        <div className="space-y-3">
          <Label htmlFor="file" className="label-mono text-muted-foreground">
            Photograph
          </Label>

          <div
            data-drag={drag}
            className="darkroom-drop relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-sm"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
            aria-label="Choose or drop a photograph"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Selected frame"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-primary/30" />
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 label-mono shadow-sm hover:bg-background"
                >
                  Replace
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <DarkroomIcon />
                <p className="display-italic text-lg">Drop a frame here</p>
                <p className="telegram">or click to browse · jpeg, png, webp, heic · ≤ 20 mb</p>
              </div>
            )}
            <input
              ref={inputRef}
              id="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              onChange={e => pick(e.target.files?.[0])}
              className="sr-only"
              required
            />
          </div>

          {file && (
            <p className="telegram">
              loaded · {file.name} · {(file.size / 1024 / 1024).toFixed(2)} mb
            </p>
          )}
        </div>

        {/* Caption + submit */}
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="cap" className="label-mono text-muted-foreground">
              Caption
            </Label>
            <Textarea
              id="cap"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={6}
              placeholder="A line, a memory, a coordinate…"
              className="rounded-sm bg-popover/60 font-[var(--font-body)] text-base leading-relaxed"
            />
            <p className="telegram">
              {caption.length === 0
                ? 'leave blank for an untitled dispatch'
                : `${caption.length} characters · ${caption.trim().split(/\s+/).filter(Boolean).length} words`}
            </p>
          </div>

          <div className="postal-rule mt-auto" aria-hidden />

          <div className="flex items-center justify-between gap-4">
            <p className="telegram">
              EXIF data is stripped. Only the photograph and caption are kept.
            </p>
            <Button
              type="submit"
              disabled={busy || !file}
              className="ink-press btn-stamp rounded-sm px-6"
            >
              {busy ? 'Stamping…' : 'Stamp & post'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function DarkroomIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden
      className="text-primary/80"
    >
      <rect x="4" y="10" width="36" height="26" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 10 L16 6 L28 6 L30 10" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="22" cy="24" r="7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="22" cy="24" r="2" fill="currentColor" />
      <circle cx="35" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}
