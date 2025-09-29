import { get, set, del } from "idb-keyval";
import { ParsedVpnProfile, VpnProfileType } from "./types";

export interface StoredVpnProfileMetadata {
  id: string;
  name: string;
  type: VpnProfileType;
  createdAt: string;
  warnings: string[];
  hasSecrets: boolean;
}

interface EncryptedPayload {
  version: number;
  cipher: string;
  iv: string;
  salt: string;
  createdAt: string;
}

interface PlainPayload {
  version: number;
  profile: ParsedVpnProfile;
  createdAt: string;
}

const PROFILE_INDEX_KEY = "vpn-profile-index";
const PROFILE_KEY_PREFIX = "vpn-profile";
const ENCRYPTED_KEY_PREFIX = "vpn-secret";
const PAYLOAD_VERSION = 1;

function getCrypto(): Crypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  try {
    const { webcrypto } = require("node:crypto");
    return webcrypto as Crypto;
  } catch {
    throw new Error("WebCrypto API is not available in this environment");
  }
}

function getNodeCrypto() {
  try {
    return require("node:crypto");
  } catch {
    return null;
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getIndex(): StoredVpnProfileMetadata[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PROFILE_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredVpnProfileMetadata[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setIndex(entries: StoredVpnProfileMetadata[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(entries));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const crypto = getCrypto();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function encryptWithNodeCrypto(
  payload: PlainPayload,
  passphrase: string,
  saltBytes: Uint8Array,
  ivBytes: Uint8Array
): EncryptedPayload {
  const nodeCrypto = getNodeCrypto();
  if (!nodeCrypto) {
    throw new Error("Node.js crypto module is unavailable for encryption fallback");
  }
  const { pbkdf2Sync, createCipheriv } = nodeCrypto;
  const saltBuffer = Buffer.from(saltBytes);
  const ivBuffer = Buffer.from(ivBytes);
  const key = pbkdf2Sync(passphrase, saltBuffer, 250000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, ivBuffer);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, tag]);
  return {
    version: PAYLOAD_VERSION,
    cipher: combined.toString("base64"),
    iv: ivBuffer.toString("base64"),
    salt: saltBuffer.toString("base64"),
    createdAt: payload.createdAt,
  };
}

function decryptWithNodeCrypto(record: EncryptedPayload, passphrase: string): ParsedVpnProfile {
  const nodeCrypto = getNodeCrypto();
  if (!nodeCrypto) {
    throw new Error("Node.js crypto module is unavailable for decryption fallback");
  }
  const { pbkdf2Sync, createDecipheriv } = nodeCrypto;
  const saltBuffer = Buffer.from(record.salt, "base64");
  const ivBuffer = Buffer.from(record.iv, "base64");
  const fullCipher = Buffer.from(record.cipher, "base64");
  if (fullCipher.length < 17) {
    throw new Error("Encrypted payload is malformed");
  }
  const ciphertext = fullCipher.slice(0, fullCipher.length - 16);
  const authTag = fullCipher.slice(fullCipher.length - 16);
  const key = pbkdf2Sync(passphrase, saltBuffer, 250000, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, ivBuffer);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const payload = JSON.parse(decrypted.toString("utf8")) as PlainPayload;
  if (payload.version !== PAYLOAD_VERSION) {
    throw new Error("Unsupported payload version");
  }
  return payload.profile;
}

async function encryptProfile(profile: ParsedVpnProfile, passphrase: string): Promise<EncryptedPayload> {
  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload: PlainPayload = {
    version: PAYLOAD_VERSION,
    profile,
    createdAt: new Date().toISOString(),
  };
  const data = encoder.encode(JSON.stringify(payload));
  try {
    const key = await deriveKey(passphrase, salt);
    const cipherBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      data
    );
    return {
      version: PAYLOAD_VERSION,
      cipher: bufferToBase64(cipherBuffer),
      iv: bufferToBase64(iv.buffer),
      salt: bufferToBase64(salt.buffer),
      createdAt: payload.createdAt,
    };
  } catch (error) {
    if (typeof window !== "undefined") {
      throw error;
    }
    return encryptWithNodeCrypto(payload, passphrase, salt, iv);
  }
}

async function decryptProfile(record: EncryptedPayload, passphrase: string): Promise<ParsedVpnProfile> {
  const crypto = getCrypto();
  const salt = new Uint8Array(base64ToBuffer(record.salt));
  const iv = new Uint8Array(base64ToBuffer(record.iv));
  try {
    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      base64ToBuffer(record.cipher)
    );
    const payload = JSON.parse(decoder.decode(decrypted)) as PlainPayload;
    if (payload.version !== PAYLOAD_VERSION) {
      throw new Error("Unsupported payload version");
    }
    return payload.profile;
  } catch (error) {
    if (typeof window !== "undefined") {
      throw error;
    }
    return decryptWithNodeCrypto(record, passphrase);
  }
}

function hasSecrets(profile: ParsedVpnProfile): boolean {
  const secrets = profile.nmConnection.secrets;
  return !!secrets && Object.values(secrets).some((value) => value && value !== "ask");
}

export function profileNeedsPassphrase(profile: ParsedVpnProfile): boolean {
  return hasSecrets(profile);
}

function profileKey(id: string) {
  return `${PROFILE_KEY_PREFIX}:${id}`;
}

function secretKey(id: string) {
  return `${ENCRYPTED_KEY_PREFIX}:${id}`;
}

export async function listVpnProfiles(): Promise<StoredVpnProfileMetadata[]> {
  return getIndex();
}

export async function persistVpnProfile(profile: ParsedVpnProfile, passphrase?: string) {
  const metadata: StoredVpnProfileMetadata = {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    createdAt: new Date().toISOString(),
    warnings: profile.warnings,
    hasSecrets: hasSecrets(profile),
  };
  const index = getIndex().filter((entry) => entry.id !== profile.id);
  index.push(metadata);
  setIndex(index);

  if (metadata.hasSecrets) {
    if (!passphrase) {
      throw new Error("A passphrase is required to store credentials for this profile");
    }
    const encrypted = await encryptProfile(profile, passphrase);
    await set(secretKey(profile.id), encrypted);
    await del(profileKey(profile.id));
  } else {
    const payload: PlainPayload = {
      version: PAYLOAD_VERSION,
      profile,
      createdAt: metadata.createdAt,
    };
    await set(profileKey(profile.id), payload);
    await del(secretKey(profile.id));
  }
}

export async function loadVpnProfile(id: string, passphrase?: string): Promise<ParsedVpnProfile | null> {
  const index = getIndex();
  const entry = index.find((item) => item.id === id);
  if (!entry) return null;
  if (entry.hasSecrets) {
    if (!passphrase) {
      throw new Error("Passphrase required to decrypt VPN profile");
    }
    const record = (await get(secretKey(id))) as EncryptedPayload | undefined;
    if (!record) return null;
    return decryptProfile(record, passphrase);
  }
  const payload = (await get(profileKey(id))) as PlainPayload | undefined;
  return payload?.profile ?? null;
}

export async function removeVpnProfile(id: string) {
  const index = getIndex().filter((entry) => entry.id !== id);
  setIndex(index);
  await Promise.all([del(profileKey(id)), del(secretKey(id))]);
}
