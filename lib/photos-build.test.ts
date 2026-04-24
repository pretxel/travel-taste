import { describe, it, expect } from 'vitest';
import { humanizeSlug } from './photos-build';

describe('humanizeSlug', () => {
  it('capitalizes a single word', () => {
    expect(humanizeSlug('santorini')).toBe('Santorini');
  });

  it('replaces dashes with spaces and title-cases each word', () => {
    expect(humanizeSlug('santorini-greece')).toBe('Santorini Greece');
  });

  it('replaces underscores with spaces and title-cases each word', () => {
    expect(humanizeSlug('machu_picchu')).toBe('Machu Picchu');
  });

  it('returns empty string for empty input', () => {
    expect(humanizeSlug('')).toBe('');
  });

  it('collapses repeated separators', () => {
    expect(humanizeSlug('bali--ubud')).toBe('Bali Ubud');
  });
});

import { groupResources, MAX_RESOURCES } from './photos-build';
import type { CloudinaryResource } from './photos';

function resource(overrides: Partial<CloudinaryResource> = {}): CloudinaryResource {
  return {
    public_id: 'travel-taste/santorini/default',
    width: 1000,
    height: 800,
    created_at: '2024-01-01T00:00:00Z',
    folder: 'travel-taste/santorini',
    ...overrides,
  };
}

describe('groupResources', () => {
  it('returns empty array for no resources', () => {
    expect(groupResources([], 'travel-taste')).toEqual([]);
  });

  it('groups resources by first path segment under root', () => {
    const input = [
      resource({ public_id: 'travel-taste/santorini/a', folder: 'travel-taste/santorini' }),
      resource({ public_id: 'travel-taste/kyoto/b', folder: 'travel-taste/kyoto' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result.map(s => s.slug)).toEqual(['kyoto', 'santorini']);
    expect(result.find(s => s.slug === 'kyoto')!.photos).toHaveLength(1);
  });

  it('flattens nested subfolders into their top-level section', () => {
    const input = [
      resource({
        public_id: 'travel-taste/santorini/sunset/a',
        folder: 'travel-taste/santorini/sunset',
      }),
      resource({
        public_id: 'travel-taste/santorini/b',
        folder: 'travel-taste/santorini',
      }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('santorini');
    expect(result[0].photos).toHaveLength(2);
  });

  it('skips resources directly under root', () => {
    const input = [
      resource({ public_id: 'travel-taste/top-level', folder: 'travel-taste' }),
      resource({ public_id: 'travel-taste/bali/x', folder: 'travel-taste/bali' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result.map(s => s.slug)).toEqual(['bali']);
  });

  it('skips resources missing width or height', () => {
    const input = [
      resource({ public_id: 'travel-taste/bali/a', folder: 'travel-taste/bali', width: 0 }),
      resource({ public_id: 'travel-taste/bali/b', folder: 'travel-taste/bali' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result[0].photos.map(p => p.publicId)).toEqual(['travel-taste/bali/b']);
  });

  it('sorts sections alphabetically by slug', () => {
    const input = [
      resource({ public_id: 'travel-taste/zebra/a', folder: 'travel-taste/zebra' }),
      resource({ public_id: 'travel-taste/alpha/b', folder: 'travel-taste/alpha' }),
      resource({ public_id: 'travel-taste/mango/c', folder: 'travel-taste/mango' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result.map(s => s.slug)).toEqual(['alpha', 'mango', 'zebra']);
  });

  it('sorts photos within a section by created_at descending', () => {
    const input = [
      resource({
        public_id: 'travel-taste/bali/old',
        folder: 'travel-taste/bali',
        created_at: '2020-01-01T00:00:00Z',
      }),
      resource({
        public_id: 'travel-taste/bali/new',
        folder: 'travel-taste/bali',
        created_at: '2024-06-01T00:00:00Z',
      }),
      resource({
        public_id: 'travel-taste/bali/mid',
        folder: 'travel-taste/bali',
        created_at: '2022-03-01T00:00:00Z',
      }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result[0].photos.map(p => p.publicId)).toEqual([
      'travel-taste/bali/new',
      'travel-taste/bali/mid',
      'travel-taste/bali/old',
    ]);
  });

  it('humanizes slugs into section titles', () => {
    const input = [
      resource({
        public_id: 'travel-taste/machu-picchu/a',
        folder: 'travel-taste/machu-picchu',
      }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result[0].title).toBe('Machu Picchu');
  });

  it('respects the MAX_RESOURCES hard cap', () => {
    const input: CloudinaryResource[] = Array.from({ length: MAX_RESOURCES + 100 }, (_, i) =>
      resource({
        public_id: `travel-taste/bali/${i}`,
        folder: 'travel-taste/bali',
      })
    );
    const result = groupResources(input, 'travel-taste');
    expect(result[0].photos).toHaveLength(MAX_RESOURCES);
  });

  it('normalizes a root folder with a trailing slash', () => {
    const input = [resource({ public_id: 'travel-taste/bali/a', folder: 'travel-taste/bali' })];
    const result = groupResources(input, 'travel-taste/');
    expect(result.map(s => s.slug)).toEqual(['bali']);
  });
});
