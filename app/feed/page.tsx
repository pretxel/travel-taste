import { MasonryFeed } from '@/components/feed/masonry-feed';
import { headers } from 'next/headers';

export default async function FeedPage() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  const res = await fetch(`${proto}://${host}/api/feed`, {
    cache: 'no-store',
    headers: { cookie: h.get('cookie') ?? '' },
  });
  const j = await res.json();
  const posts = (j.posts ?? []) as Array<{
    id: string;
    signed_url: string;
    caption: string | null;
    width: number;
    height: number;
    taken_at: string | null;
    created_at: string;
  }>;
  const issueLabel = new Date().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative min-h-screen pb-20">
      <header className="mx-auto w-full max-w-5xl px-5 pt-10 pb-8 sm:px-8 sm:pt-14">
        <div className="flex items-end justify-between gap-4 border-b border-foreground/15 pb-5">
          <div>
            <p className="label-mono text-primary">The Travel Diary</p>
            <h1 className="display mt-2 text-4xl sm:text-5xl">
              Postcards
              <span className="display-italic text-muted-foreground"> from the road</span>
            </h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="label-mono text-muted-foreground">Issue</p>
            <p className="font-mono text-sm tracking-wide text-foreground">{issueLabel}</p>
          </div>
        </div>
        <p className="mt-4 max-w-xl italic text-muted-foreground">
          {posts.length === 0
            ? 'The first letter has not been sent yet. Check back soon.'
            : `${posts.length} dispatch${posts.length === 1 ? '' : 'es'}, kept for you.`}
        </p>
      </header>

      <MasonryFeed posts={posts} nextCursor={j.next_cursor ?? null} />
    </div>
  );
}
