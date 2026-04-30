import React from 'react';
import Link from 'next/link';

interface Props {
  url: string;
  caption: string | null;
  width: number;
  height: number;
  takenAt: string | null;
  createdAt: string;
}

export function PostDetail({ url, caption, width, height, takenAt, createdAt }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <Link href="/feed" className="text-sm text-muted-foreground hover:underline">
        ← Back
      </Link>
      <img
        src={url}
        alt=""
        style={{ aspectRatio: width && height ? `${width} / ${height}` : '1 / 1' }}
        className="w-full rounded-md object-contain"
      />
      {caption && <p className="text-base leading-relaxed">{caption}</p>}
      <p className="text-xs text-muted-foreground">
        Posted {new Date(createdAt).toLocaleString()}
        {takenAt && ` · taken ${new Date(takenAt).toLocaleDateString()}`}
      </p>
    </div>
  );
}
