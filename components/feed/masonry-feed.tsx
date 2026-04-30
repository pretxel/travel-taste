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
    <div className="columns-2 gap-3 px-3 [column-fill:_balance] sm:gap-4 sm:px-4">
      {posts.map(p => (
        <PostTile
          key={p.id}
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
  );
}
