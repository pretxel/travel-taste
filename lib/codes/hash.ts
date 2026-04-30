import { hash, verify, Algorithm } from '@node-rs/argon2';

const OPTS = {
  algorithm: Algorithm.Argon2id,
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
