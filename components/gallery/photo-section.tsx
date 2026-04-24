'use client';

import { useState } from 'react';
import { MasonryGrid } from './masonry-grid';
import { PhotoTile } from './photo-tile';
import { ImageModal } from '@/components/ui/image-modal';
import type { PhotoSection as PhotoSectionType } from '@/lib/photos';

export function PhotoSection({ slug, title, photos }: PhotoSectionType) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <section aria-labelledby={`section-${slug}`}>
      <h2 id={`section-${slug}`} className="text-2xl font-semibold mb-4">
        {title}
      </h2>
      <MasonryGrid>
        {photos.map((photo, i) => (
          <PhotoTile key={photo.publicId} photo={photo} index={i} onOpen={setOpenIdx} />
        ))}
      </MasonryGrid>
      <ImageModal
        photos={photos}
        index={openIdx}
        onIndexChange={setOpenIdx}
        onClose={() => setOpenIdx(null)}
      />
    </section>
  );
}
