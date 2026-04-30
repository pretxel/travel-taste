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
  const taken = takenAt
    ? new Date(takenAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const posted = new Date(createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const aspect = width && height ? `${width} / ${height}` : '3 / 4';

  return (
    <article className="relative mx-auto w-full max-w-3xl px-5 pt-8 pb-24 sm:px-8 sm:pt-12">
      <Link
        href="/feed"
        className="label-mono inline-flex items-center gap-2 text-muted-foreground transition hover:text-primary"
      >
        <span aria-hidden>←</span> Return to the diary
      </Link>

      <header className="mt-10 grid gap-6 border-b border-foreground/15 pb-7 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="label-mono text-primary">A Postcard</p>
          <h1 className="display mt-2 text-4xl leading-[0.95] sm:text-5xl">
            {taken ? (
              <>
                <span>{taken.split(',')[0]}</span>
                <span className="display-italic text-muted-foreground">
                  ,{taken.split(',').slice(1).join(',')}
                </span>
              </>
            ) : (
              <span className="display-italic">An undated note</span>
            )}
          </h1>
        </div>
        <div className="text-right">
          <p className="label-mono text-muted-foreground">Filed</p>
          <p className="font-mono text-sm">{posted}</p>
        </div>
      </header>

      <figure className="paper-card mt-10 overflow-hidden rounded-sm">
        <img
          src={url}
          alt={caption ?? ''}
          style={{ aspectRatio: aspect }}
          className="w-full object-contain"
        />
      </figure>

      {caption && (
        <div className="mt-10 grid gap-4 sm:grid-cols-[3rem_1fr]">
          <p className="label-mono pt-1 text-primary sm:text-right">Note</p>
          <p className="text-pretty text-xl leading-relaxed text-foreground/90 sm:text-2xl">
            <span className="display-italic text-3xl text-primary leading-none align-[-0.1em]">
              “
            </span>
            {caption}
            <span className="display-italic text-3xl text-primary leading-none align-[-0.1em]">
              ”
            </span>
          </p>
        </div>
      )}

      <footer className="mt-16 flex items-center justify-between border-t border-foreground/15 pt-6">
        <span className="hand-rule" aria-hidden />
        <Link
          href="/feed"
          className="label-mono text-muted-foreground transition hover:text-primary"
        >
          Next dispatch →
        </Link>
      </footer>
    </article>
  );
}
