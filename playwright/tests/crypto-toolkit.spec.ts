import { test, expect } from '@playwright/test';
import { createHash } from 'crypto';

type CryptoToolkitResult = {
  hashDigest: string;
  aesSummary: {
    plaintext: string;
    ciphertextLength: number;
    iv: number[];
  };
  jwtSummary: {
    token: string;
    isValid: boolean;
  };
  measures: { name: string; duration: number }[];
  longTasks: { name: string; duration: number }[];
  baselineMemory: number | null;
  memoryAfterOps: number | null;
  memoryAfterClear: number | null;
};

test.describe('Crypto Toolkit flows', () => {
  test('hashing, AES, and JWT workflows stay performant', async ({ page }) => {
    const payloads = {
      hashInput: 'Crypto toolkit hashing payload',
      aesMessage: 'AES flow secret text for toolkit',
      jwtPayload: { sub: 'playwright', role: 'tester', exp: 1_893_456_000 },
      jwtSecret: 'crypto-toolkit-secret',
    } as const;

    await page.goto('/apps/security-education');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async (inputs) => {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const toHex = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let hex = '';
        for (let i = 0; i < bytes.length; i += 1) {
          hex += bytes[i].toString(16).padStart(2, '0');
        }
        return hex;
      };

      const base64UrlEncode = (data: ArrayBuffer | Uint8Array) => {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      const base64UrlEncodeString = (value: string) =>
        base64UrlEncode(encoder.encode(value));

      const base64UrlToUint8Array = (value: string) => {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
        const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
        const padded = normalized + '='.repeat(padding);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      };

      const baselineMemory = performance.memory?.usedJSHeapSize ?? null;
      const testStart = performance.now();

      const run = async (name: string, task: () => Promise<any>) => {
        const start = `${name}-start`;
        const end = `${name}-end`;
        performance.mark(start);
        const value = await task();
        performance.mark(end);
        performance.measure(name, start, end);
        return value;
      };

      const hashDigest = await run('hashing', async () => {
        const data = encoder.encode(inputs.hashInput);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return toHex(digest);
      });

      let aesCipherBytes: Uint8Array | null = null;
      const aesSummary = await run('aes', async () => {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const message = encoder.encode(inputs.aesMessage);
        const keyMaterial = encoder.encode('0123456789abcdef0123456789abcdef');
        const key = await crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['encrypt', 'decrypt']);
        const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, message);
        aesCipherBytes = new Uint8Array(encryptedBuffer);
        const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBuffer);
        return {
          plaintext: decoder.decode(decryptedBuffer),
          ciphertextLength: aesCipherBytes.length,
          iv: Array.from(iv),
        };
      });

      const jwtKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(inputs.jwtSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
      );

      const jwtSummary = await run('jwt-verify', async () => {
        const header = base64UrlEncodeString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = base64UrlEncodeString(JSON.stringify(inputs.jwtPayload));
        const signingInput = `${header}.${payload}`;
        const signatureBuffer = await crypto.subtle.sign('HMAC', jwtKey, encoder.encode(signingInput));
        const signature = base64UrlEncode(signatureBuffer);
        const token = `${signingInput}.${signature}`;
        const signatureBytes = base64UrlToUint8Array(signature);
        const isValid = await crypto.subtle.verify('HMAC', jwtKey, signatureBytes, encoder.encode(signingInput));
        return { token, isValid };
      });

      (window as any).__cryptoToolkitState = {
        hashDigest,
        aesCipherBytes,
        jwtToken: jwtSummary.token,
      };

      const memoryAfterOps = performance.memory?.usedJSHeapSize ?? null;

      (window as any).__cryptoToolkitState = null;
      aesCipherBytes = null;

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const memoryAfterClear = performance.memory?.usedJSHeapSize ?? null;

      const measures = performance
        .getEntriesByType('measure')
        .filter((entry) => ['hashing', 'aes', 'jwt-verify'].includes(entry.name))
        .map((entry) => ({ name: entry.name, duration: entry.duration }));

      const longTasks = performance
        .getEntriesByType('longtask')
        .filter((entry) => entry.startTime >= testStart)
        .map((entry) => ({ name: entry.name, duration: entry.duration }));

      performance.clearMarks();
      performance.clearMeasures();

      return {
        hashDigest,
        aesSummary,
        jwtSummary,
        measures,
        longTasks,
        baselineMemory,
        memoryAfterOps,
        memoryAfterClear,
      };
    }, payloads) as CryptoToolkitResult;

    const expectedHash = createHash('sha256').update(payloads.hashInput).digest('hex');
    expect(result.hashDigest).toBe(expectedHash);

    expect(result.aesSummary.plaintext).toBe(payloads.aesMessage);
    expect(result.aesSummary.ciphertextLength).toBeGreaterThan(0);
    expect(result.aesSummary.iv).toHaveLength(12);

    expect(result.jwtSummary.isValid).toBeTruthy();
    expect(result.jwtSummary.token.split('.')).toHaveLength(3);

    const durationByName = Object.fromEntries(result.measures.map((m) => [m.name, m.duration]));
    expect(durationByName['hashing']).toBeGreaterThan(0);
    expect(durationByName['aes']).toBeGreaterThan(0);
    expect(durationByName['jwt-verify']).toBeGreaterThan(0);

    expect(result.longTasks.length).toBe(0);

    expect(result.baselineMemory).not.toBeNull();
    expect(result.memoryAfterOps).not.toBeNull();
    expect(result.memoryAfterClear).not.toBeNull();

    if (
      result.baselineMemory !== null &&
      result.memoryAfterClear !== null
    ) {
      const baseline = result.baselineMemory;
      const afterClear = result.memoryAfterClear;
      const tolerance = Math.max(baseline * 0.05, 5 * 1024 * 1024);
      expect(Math.abs(afterClear - baseline)).toBeLessThanOrEqual(tolerance);
    }
  });
});
