import React from 'react';
import { PostTile } from './post-tile';
import { LoadMore } from './load-more';

interface FeedPost {
  id: string;
  signed_url: string;
  caption: string | null;
  width: number;
  height: number;
  taken_at: string | null;
  created_at: string;
}

export function MasonryFeed({
  posts,
  nextCursor,
}: {
  posts: FeedPost[];
  nextCursor: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
      <div className="columns-2 gap-5 [column-fill:_balance] sm:columns-3 sm:gap-7">
        {posts.map((p, i) => (
          <PostTile
            key={p.id}
            index={i}
            id={p.id}
            url={p.signed_url}
            caption={p.caption}
            width={p.width}
            height={p.height}
            takenAt={p.taken_at}
            createdAt={p.created_at}
          />
        ))}
        <LoadMore initialCursor={nextCursor} />
      </div>
    </div>
  );
}
