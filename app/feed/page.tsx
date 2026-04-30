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
  return (
    <div className="min-h-screen pt-4">
      <header className="px-4 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Travel Taste</h1>
      </header>
      <MasonryFeed posts={j.posts ?? []} nextCursor={j.next_cursor ?? null} />
    </div>
  );
}
