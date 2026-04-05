/**
 * Web Crypto API wrapper for the zostaje local-first vault.
 *
 * Zero external dependencies. All encryption is AES-GCM 256 with
 * PBKDF2-SHA256 (310 000 iterations) key derivation.
 *
 * Ciphertexts are serialized as base64 of: [12-byte IV][AES-GCM ciphertext].
 */

export class EncryptionError extends Error {
  constructor(message = "Nie udało się odszyfrować danych") {
    super(message);
    this.name = "EncryptionError";
  }
}

const PBKDF2_ITERATIONS = 310_000;
const IV_LENGTH = 12;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function saltToBase64(salt: Uint8Array): string {
  return toBase64(salt);
}

export function saltFromBase64(b64: string): Uint8Array {
  return fromBase64(b64);
}

/**
 * Derive an AES-GCM key from a password + salt.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt any JSON-serializable value. Returns a base64 blob safe to store.
 */
export async function encrypt(data: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(data)) as BufferSource
  );
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return toBase64(combined);
}

/**
 * Decrypt a base64 blob produced by `encrypt`. Throws EncryptionError on failure.
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<unknown> {
  try {
    const combined = fromBase64(ciphertext);
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    throw new EncryptionError();
  }
}

/**
 * Encrypt raw bytes (used for portable export files). Returns base64.
 */
export async function encryptBytes(bytes: Uint8Array, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    bytes as BufferSource
  );
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return toBase64(combined);
}

export async function decryptBytes(b64: string, key: CryptoKey): Promise<Uint8Array> {
  try {
    const combined = fromBase64(b64);
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource
    );
    return new Uint8Array(decrypted);
  } catch {
    throw new EncryptionError();
  }
}
