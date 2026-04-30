import React from 'react';
import Link from 'next/link';

interface Props {
  id: string;
  url: string;
  caption: string | null;
  width: number;
  height: number;
  takenAt: string | null;
  createdAt: string;
  index?: number;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function PostTile({
  id,
  url,
  caption,
  width,
  height,
  takenAt,
  createdAt,
  index = 0,
}: Props) {
  const aspect = width && height ? `${width} / ${height}` : '4 / 5';
  const stamp = dayLabel(takenAt ?? createdAt);
  return (
    <Link
      href={`/feed/${id}`}
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
      className="tile-in mb-6 block break-inside-avoid sm:mb-8"
    >
      <figure className="group relative">
        <div className="paper-card overflow-hidden rounded-sm">
          <img
            src={url}
            alt={caption ?? ''}
            loading="lazy"
            style={{ aspectRatio: aspect }}
            className="w-full object-cover transition duration-700 group-hover:scale-[1.015] group-hover:saturate-105"
          />
        </div>
        <figcaption className="mt-2.5 flex items-baseline justify-between gap-3">
          <p className="label-mono text-primary">{stamp}</p>
          <span className="h-px flex-1 bg-foreground/15" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            №{String(index + 1).padStart(2, '0')}
          </p>
        </figcaption>
        {caption && (
          <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-foreground/85">{caption}</p>
        )}
      </figure>
    </Link>
  );
}
