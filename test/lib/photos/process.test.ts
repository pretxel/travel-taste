// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { processUpload } from '@/lib/photos/process';

describe('processUpload', () => {
  it('strips EXIF GPS, resizes, emits blurhash + dimensions', async () => {
    const input = await readFile('test/fixtures/with-gps.jpg');
    const result = await processUpload(input, 'image/jpeg');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.blurhash).toMatch(/^[A-Za-z0-9#$%*+,\-.:;=?@[\]^_{|}~]+$/);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it('rejects unsupported mime', async () => {
    await expect(processUpload(Buffer.from('not-an-image'), 'application/pdf')).rejects.toThrow();
  });
});
