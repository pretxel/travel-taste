export const MAX_RESOURCES = 5000;

export function humanizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
