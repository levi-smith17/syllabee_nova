/**
 * AES-256-GCM encryption/decryption for sensitive config values stored in DB.
 * ENCRYPTION_KEY must be exactly 32 UTF-8 characters.
 */

const ALG = "AES-GCM";
const IV_BYTES = 12;
const enc = new TextEncoder();
const dec = new TextDecoder();

function getKey(): Promise<CryptoKey> {
  const raw = process.env.ENCRYPTION_KEY ?? "";
  if (raw.length !== 32)
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters");
  return crypto.subtle.importKey("raw", enc.encode(raw), ALG, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: ALG, iv },
    key,
    enc.encode(plain)
  );
  const combined = new Uint8Array(IV_BYTES + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), IV_BYTES);
  return Buffer.from(combined).toString("base64");
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey();
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, IV_BYTES);
  const data = combined.subarray(IV_BYTES);
  const plain = await crypto.subtle.decrypt({ name: ALG, iv }, key, data);
  return dec.decode(plain);
}
