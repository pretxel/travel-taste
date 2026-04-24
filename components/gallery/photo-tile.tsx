'use client';

import { CldImage } from 'next-cloudinary';
import type { Photo } from '@/lib/photos';

interface PhotoTileProps {
  photo: Photo;
  index: number;
  onOpen: (index: number) => void;
}

export function PhotoTile({ photo, index, onOpen }: PhotoTileProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="break-inside-avoid mb-4 block w-full cursor-pointer rounded-md overflow-hidden hover:opacity-90 transition"
      aria-label={`Open photo ${photo.publicId}`}
    >
      <CldImage
        src={photo.publicId}
        width={photo.width}
        height={photo.height}
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        alt=""
        className="w-full h-auto"
      />
    </button>
  );
}
