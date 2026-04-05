/**
 * Keystore — manages the in-memory AES key for the local vault.
 *
 * Design:
 *  - Salt lives in localStorage (not secret).
 *  - Verification token lives in IndexedDB `meta` store (encrypted small blob).
 *  - Derived key lives ONLY in a module-level variable. It is never written
 *    to localStorage, sessionStorage, cookies, or IndexedDB.
 *  - `sessionStorage.key_loaded` is a flag for the UI (not a secret).
 *  - Closing the tab wipes the key. There is no recovery.
 */

import {
  deriveKey,
  encrypt,
  decrypt,
  randomSalt,
  saltToBase64,
  saltFromBase64,
  EncryptionError,
} from "./crypto";
import { getMeta, setMeta, hasAnyData } from "./db";

const SALT_STORAGE_KEY = "zostaje.vault.salt";
const SESSION_FLAG = "zostaje.vault.unlocked";
const VERIFY_META_ID = "vault.verify";
const VERIFY_PLAINTEXT = "zostaje::vault::ok";

let _sessionKey: CryptoKey | null = null;

function getStoredSalt(): Uint8Array | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SALT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return saltFromBase64(raw);
  } catch {
    return null;
  }
}

function saveSalt(salt: Uint8Array): void {
  localStorage.setItem(SALT_STORAGE_KEY, saltToBase64(salt));
}

/**
 * Has the vault ever been set up on this device?
 */
export async function isVaultInitialized(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const salt = getStoredSalt();
  if (!salt) return false;
  const verify = await getMeta(VERIFY_META_ID);
  return !!verify;
}

export const keystore = {
  /**
   * First-time setup. Creates a new salt, derives a key from the password,
   * stores an encrypted verification token so future unlocks can validate.
   */
  async setup(password: string): Promise<void> {
    if (await isVaultInitialized()) {
      throw new Error("Skarbiec jest już zainicjalizowany");
    }
    if (await hasAnyData()) {
      // Edge: previous partial setup. Clear verify only — we don't wipe user data.
    }
    const salt = randomSalt(16);
    saveSalt(salt);
    const key = await deriveKey(password, salt);
    const token = await encrypt(VERIFY_PLAINTEXT, key);
    await setMeta(VERIFY_META_ID, token);
    _sessionKey = key;
    sessionStorage.setItem(SESSION_FLAG, "1");
  },

  /**
   * Unlock an existing vault. Throws EncryptionError on wrong password.
   */
  async unlock(password: string): Promise<void> {
    const salt = getStoredSalt();
    if (!salt) throw new Error("Skarbiec nie jest zainicjalizowany");
    const verify = await getMeta(VERIFY_META_ID);
    if (!verify) throw new Error("Brak tokenu weryfikacyjnego");

    const key = await deriveKey(password, salt);
    // Will throw EncryptionError if password is wrong.
    const decoded = await decrypt(verify, key);
    if (decoded !== VERIFY_PLAINTEXT) {
      throw new EncryptionError("Nieprawidłowe hasło");
    }
    _sessionKey = key;
    sessionStorage.setItem(SESSION_FLAG, "1");
  },

  lock(): void {
    _sessionKey = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_FLAG);
    }
  },

  isUnlocked(): boolean {
    return _sessionKey !== null;
  },

  getKey(): CryptoKey {
    if (!_sessionKey) throw new Error("Skarbiec jest zablokowany");
    return _sessionKey;
  },

  /**
   * Change the vault password. Re-encrypts the verification token, and
   * callers are responsible for re-encrypting any stored records that
   * were produced under the old key (out of scope for the initial refactor).
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.unlock(oldPassword);
    const salt = randomSalt(16);
    saveSalt(salt);
    const key = await deriveKey(newPassword, salt);
    const token = await encrypt(VERIFY_PLAINTEXT, key);
    await setMeta(VERIFY_META_ID, token);
    _sessionKey = key;
  },
};
