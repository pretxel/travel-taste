import type { CloudinaryResource, Photo, PhotoSection } from './photos';

export const MAX_RESOURCES = 5000;

export function humanizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function stripRoot(folder: string, rootFolder: string): string {
  const normalizedRoot = rootFolder.replace(/\/+$/, '');
  if (!folder.startsWith(normalizedRoot)) return '';
  const rest = folder.slice(normalizedRoot.length);
  return rest.replace(/^\/+/, '');
}

export function groupResources(
  resources: CloudinaryResource[],
  rootFolder: string
): PhotoSection[] {
  const capped = resources.slice(0, MAX_RESOURCES);
  const buckets = new Map<string, Photo[]>();

  for (const r of capped) {
    if (!r.width || !r.height) continue;
    const stripped = stripRoot(r.folder, rootFolder);
    if (!stripped) continue;
    const slug = stripped.split('/')[0];
    if (!slug) continue;

    const photo: Photo = {
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      folder: slug,
    };

    const existing = buckets.get(slug);
    if (existing) {
      existing.push(photo);
    } else {
      buckets.set(slug, [photo]);
    }
  }

  const byCreatedAt = new Map<string, string>();
  for (const r of capped) byCreatedAt.set(r.public_id, r.created_at);

  const sections: PhotoSection[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, photos]) => ({
      slug,
      title: humanizeSlug(slug),
      photos: photos.slice().sort((a, b) => {
        const ca = byCreatedAt.get(a.publicId) ?? '';
        const cb = byCreatedAt.get(b.publicId) ?? '';
        return cb.localeCompare(ca);
      }),
    }));

  return sections;
}
