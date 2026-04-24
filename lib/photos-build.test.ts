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
