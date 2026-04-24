import type { PhotoSection } from '@/lib/photos';

export const SECTIONS: PhotoSection[] = [
  {
    slug: 'bali',
    title: 'Bali',
    photos: [
      { publicId: 'travel-taste/bali/beach-01', width: 1200, height: 800, folder: 'bali' },
      { publicId: 'travel-taste/bali/temple-02', width: 900, height: 1200, folder: 'bali' },
    ],
  },
  {
    slug: 'kyoto',
    title: 'Kyoto',
    photos: [
      { publicId: 'travel-taste/kyoto/torii-01', width: 1600, height: 1000, folder: 'kyoto' },
      { publicId: 'travel-taste/kyoto/shrine-02', width: 800, height: 1200, folder: 'kyoto' },
      { publicId: 'travel-taste/kyoto/zen-garden-03', width: 1400, height: 900, folder: 'kyoto' },
    ],
  },
  {
    slug: 'santorini',
    title: 'Santorini',
    photos: [
      {
        publicId: 'travel-taste/santorini/sunset-01',
        width: 1500,
        height: 1000,
        folder: 'santorini',
      },
      {
        publicId: 'travel-taste/santorini/blue-dome-02',
        width: 1200,
        height: 1600,
        folder: 'santorini',
      },
      {
        publicId: 'travel-taste/santorini/cliff-03',
        width: 1600,
        height: 900,
        folder: 'santorini',
      },
      {
        publicId: 'travel-taste/santorini/alley-04',
        width: 900,
        height: 1200,
        folder: 'santorini',
      },
    ],
  },
];
