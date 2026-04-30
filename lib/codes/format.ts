import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford, no I L O U
const CODE_LEN = 10;
const GROUP_AT = 5;

export function generateCode(): string {
  const out: string[] = [];
  while (out.length < CODE_LEN) {
    const buf = randomBytes(CODE_LEN * 2);
    for (let i = 0; i < buf.length && out.length < CODE_LEN; i++) {
      const v = buf[i];
      if (v < ALPHABET.length * 8) {
        out.push(ALPHABET[v % ALPHABET.length]);
      }
    }
  }
  return out.join('');
}

export function groupCode(code: string): string {
  if (code.length !== CODE_LEN) {
    throw new Error(`code must be ${CODE_LEN} chars, got ${code.length}`);
  }
  return `${code.slice(0, GROUP_AT)}-${code.slice(GROUP_AT)}`;
}

export function normalizeCode(input: string): string {
  return input.replace(/-/g, '').toUpperCase();
}

export function isValidCodeFormat(input: string): boolean {
  if (!input) return false;
  const norm = normalizeCode(input);
  if (norm.length !== CODE_LEN) return false;
  for (const ch of norm) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
