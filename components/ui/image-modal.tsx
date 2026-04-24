'use client';

import { useEffect, useRef } from 'react';
import { CldImage } from 'next-cloudinary';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { Photo } from '@/lib/photos';

interface ImageModalProps {
  photos: Photo[];
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export function ImageModal({ photos, index, onIndexChange, onClose }: ImageModalProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isOpen = index !== null && photos.length > 0;

  useEffect(() => {
    if (!isOpen || index === null) return;
    const total = photos.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange((index! + 1) % total);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange((index! - 1 + total) % total);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, index, photos.length, onIndexChange, onClose]);

  if (!isOpen || index === null) return null;
  const current = photos[index];
  const total = photos.length;

  const go = (delta: number) => {
    onIndexChange((index + delta + total) % total);
  };

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-5xl p-0 bg-background overflow-hidden"
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{current.publicId}</DialogTitle>
        <div
          data-testid="modal-swipe-surface"
          className="relative flex items-center justify-center bg-black/95"
          onPointerDown={e => {
            pointerStart.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={e => {
            const start = pointerStart.current;
            pointerStart.current = null;
            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (Math.abs(dx) <= Math.abs(dy)) return;
            if (dx > SWIPE_THRESHOLD) go(-1);
            else if (dx < -SWIPE_THRESHOLD) go(1);
          }}
        >
          <CldImage
            src={current.publicId}
            width={current.width}
            height={current.height}
            alt={current.publicId}
            className="max-h-[80vh] w-auto h-auto object-contain"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 hover:bg-background"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 hover:bg-background"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
        <p className="px-4 py-2 text-center text-xs text-muted-foreground truncate">
          {current.publicId}
        </p>
      </DialogContent>
    </Dialog>
  );
}
