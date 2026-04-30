import { hash, verify } from '@node-rs/argon2';

const OPTS = {
  // Algorithm.Argon2id = 2 in @node-rs/argon2; using literal to satisfy
  // TypeScript's isolatedModules constraint.
  algorithm: 2 as const,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashCode(plaintext: string): Promise<string> {
  return hash(plaintext, OPTS);
}

export async function verifyCode(plaintext: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plaintext);
  } catch {
    return false;
  }
}
