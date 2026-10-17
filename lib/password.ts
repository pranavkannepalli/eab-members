import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

// Password hashes are "scrypt$N$r$p$salt$hash" (base64). node:crypto only: no native deps, safe on Vercel.
const N = 16384, R = 8, P = 1, LEN = 64;

function derive(pw: string, salt: Buffer, n: number, r: number, p: number) {
  return new Promise<Buffer>((ok, fail) => scrypt(pw.normalize("NFKC"), salt, LEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? fail(e) : ok(k))));
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return ["scrypt", N, R, P, salt.toString("base64"), (await derive(pw, salt, N, R, P)).toString("base64")].join("$");
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, n, r, p, salt, hash] = (stored || "").split("$");
  if (alg !== "scrypt" || !hash) return false;
  const want = Buffer.from(hash, "base64");
  const got = await derive(pw, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  return got.length === want.length && timingSafeEqual(got, want);
}
