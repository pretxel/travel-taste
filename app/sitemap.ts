import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://travel-taste.example.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the public landing is indexable. Everything else is passcode-gated.
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
