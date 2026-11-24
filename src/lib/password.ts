import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${(await scrypt(pw, salt, 32)).toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = await scrypt(pw, Buffer.from(salt, "base64url"), 32), b = Buffer.from(hash, "base64url");
  return a.length === b.length && timingSafeEqual(a, b);
}
