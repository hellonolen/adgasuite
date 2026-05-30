/**
 * Server-side symmetric encryption for secrets we MUST persist (OAuth refresh
 * tokens, mailbox access tokens, encrypted message bodies for inbox sync).
 *
 * Keyed off `ADGA_ENCRYPTION_KEY` — a 32+ char passphrase configured per
 * environment. The passphrase is SHA-256 hashed to derive a 32-byte AES-GCM
 * key (Web Crypto exposes this primitive on Workers and on Node 20+).
 *
 * Ciphertext format: base64(iv || ciphertext)
 *   - First 12 bytes = randomly-generated IV per encryption
 *   - Remaining bytes = AES-GCM ciphertext (includes auth tag)
 *
 * SECURITY:
 *   - Never log plaintext OR ciphertext anywhere in this module.
 *   - The decrypt helper throws on tampering — callers must treat the throw
 *     as "token unusable, rotate or revoke".
 */

const ENC_KEY_VAR = "ADGA_ENCRYPTION_KEY";

function readKeyMaterial(): string {
  const key = process.env[ENC_KEY_VAR];
  if (!key || key.length < 32) {
    throw new Error(`${ENC_KEY_VAR} missing or too short (need >= 32 chars).`);
  }
  return key;
}

async function deriveAesKey(): Promise<CryptoKey> {
  const passphrase = readKeyMaterial();
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(passphrase));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function encrypt(plain: string): Promise<string> {
  if (!plain) return "";
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)),
  );
  const combined = new Uint8Array(iv.length + cipher.length);
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  return bytesToBase64(combined);
}

export async function decrypt(cipherB64: string): Promise<string> {
  if (!cipherB64) return "";
  const key = await deriveAesKey();
  const combined = base64ToBytes(cipherB64);
  if (combined.length < 13) throw new Error("ciphertext too short");
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

export function isEncryptionConfigured(): boolean {
  const key = process.env[ENC_KEY_VAR];
  return Boolean(key && key.length >= 32);
}
