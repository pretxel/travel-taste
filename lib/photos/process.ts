import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
import { ALLOWED_MIME, RESIZE_MAX_EDGE_PX } from '@/lib/constants';

export interface ProcessedUpload {
  buffer: Buffer;
  width: number;
  height: number;
  blurhash: string;
  takenAt: Date | null;
  contentType: 'image/jpeg';
}

export async function processUpload(input: Buffer, mime: string): Promise<ProcessedUpload> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`Unsupported mime type: ${mime}`);
  }

  const pre = sharp(input, { failOn: 'error' });
  const meta = await pre.metadata();
  const takenAt = parseExifDate(meta.exif);

  const pipeline = sharp(input, { failOn: 'error' })
    .rotate()
    .resize({
      width: RESIZE_MAX_EDGE_PX,
      height: RESIZE_MAX_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true });

  const buffer = await pipeline.toBuffer();
  const out = await sharp(buffer).metadata();

  const small = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurhash = encodeBlurhash(
    new Uint8ClampedArray(small.data),
    small.info.width,
    small.info.height,
    4,
    4
  );

  return {
    buffer,
    width: out.width ?? 0,
    height: out.height ?? 0,
    blurhash,
    takenAt,
    contentType: 'image/jpeg',
  };
}

function parseExifDate(exif: Buffer | undefined): Date | null {
  if (!exif) return null;
  const ascii = exif.toString('latin1');
  const m = ascii.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}
