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
}

export function PostTile({ id, url, caption, width, height, createdAt }: Props) {
  const aspect = width && height ? `${width} / ${height}` : '1 / 1';
  return (
    <Link href={`/feed/${id}`} className="block break-inside-avoid space-y-1.5">
      <img
        src={url}
        alt=""
        loading="lazy"
        style={{ aspectRatio: aspect }}
        className="w-full rounded-md object-cover"
      />
      {caption && <p className="text-sm leading-snug line-clamp-2">{caption}</p>}
      <p className="text-xs text-muted-foreground">{new Date(createdAt).toLocaleDateString()}</p>
    </Link>
  );
}
