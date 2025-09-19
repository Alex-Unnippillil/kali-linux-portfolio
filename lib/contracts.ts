export interface VersionedEnvelope<V extends number, T> {
  v: V;
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEnvelope(value: unknown): value is VersionedEnvelope<number, unknown> {
  return (
    isRecord(value) &&
    typeof (value as Record<string, unknown>).v === 'number' &&
    Object.prototype.hasOwnProperty.call(value, 'data')
  );
}

interface NegotiationOptions<T> {
  latestVersion: number;
  adapters?: Partial<Record<number, (data: unknown) => T>>;
  legacyAdapter?: (payload: unknown) => T;
}

function negotiateEnvelope<T>(
  payload: unknown,
  { latestVersion, adapters, legacyAdapter }: NegotiationOptions<T>,
): VersionedEnvelope<number, T> {
  if (isEnvelope(payload)) {
    const { v, data } = payload;
    if (v === latestVersion) {
      return { v, data: data as T };
    }
    const adapter = adapters?.[v];
    if (adapter) {
      return { v: latestVersion, data: adapter(data) };
    }
  }
  if (legacyAdapter) {
    return { v: latestVersion, data: legacyAdapter(payload) };
  }
  throw new Error('Unsupported payload version');
}

export function wrapEnvelope<V extends number, T>(
  version: V,
  data: T,
): VersionedEnvelope<V, T> {
  return { v: version, data };
}

// Contact contract
export const CONTACT_CONTRACT_VERSION = 1 as const;

export interface ContactSubmitRequestData {
  name: string;
  email: string;
  message: string;
  honeypot?: string;
  recaptchaToken: string;
}

function adaptLegacyContactSubmit(payload: unknown): ContactSubmitRequestData {
  if (!isRecord(payload)) {
    throw new Error('Invalid contact payload');
  }
  const { name, email, message, honeypot, recaptchaToken = '' } = payload;
  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string'
  ) {
    throw new Error('Invalid contact payload');
  }
  return {
    name,
    email,
    message,
    honeypot: typeof honeypot === 'string' ? honeypot : '',
    recaptchaToken: typeof recaptchaToken === 'string' ? recaptchaToken : '',
  };
}

export type ContactSubmitRequestEnvelope = VersionedEnvelope<
  typeof CONTACT_CONTRACT_VERSION,
  ContactSubmitRequestData
>;

export function createContactSubmitRequest(
  data: ContactSubmitRequestData,
): ContactSubmitRequestEnvelope {
  return wrapEnvelope(CONTACT_CONTRACT_VERSION, data);
}

export function parseContactSubmitRequest(
  payload: unknown,
): ContactSubmitRequestData {
  return negotiateEnvelope<ContactSubmitRequestData>(payload, {
    latestVersion: CONTACT_CONTRACT_VERSION,
    legacyAdapter: adaptLegacyContactSubmit,
  }).data;
}

export interface ContactResponseData {
  ok: boolean;
  code?: string;
  csrfToken?: string;
}

export type ContactResponseEnvelope = VersionedEnvelope<
  typeof CONTACT_CONTRACT_VERSION,
  ContactResponseData
>;

function adaptLegacyContactResponse(payload: unknown): ContactResponseData {
  if (!isRecord(payload)) {
    throw new Error('Invalid contact response');
  }
  const { ok, code, csrfToken } = payload;
  if (typeof ok !== 'boolean') {
    throw new Error('Invalid contact response');
  }
  return {
    ok,
    code: typeof code === 'string' ? code : undefined,
    csrfToken: typeof csrfToken === 'string' ? csrfToken : undefined,
  };
}

export function createContactResponse(
  data: ContactResponseData,
): ContactResponseEnvelope {
  return wrapEnvelope(CONTACT_CONTRACT_VERSION, data);
}

export function parseContactResponse(payload: unknown): ContactResponseData {
  return negotiateEnvelope<ContactResponseData>(payload, {
    latestVersion: CONTACT_CONTRACT_VERSION,
    legacyAdapter: adaptLegacyContactResponse,
  }).data;
}

// Admin messages contract
export const ADMIN_MESSAGES_CONTRACT_VERSION = 1 as const;

export interface AdminMessagesSuccessData {
  messages: any[];
}

export interface AdminMessagesErrorData {
  error: string;
}

export type AdminMessagesResponseData =
  | AdminMessagesSuccessData
  | AdminMessagesErrorData;

export type AdminMessagesResponseEnvelope = VersionedEnvelope<
  typeof ADMIN_MESSAGES_CONTRACT_VERSION,
  AdminMessagesResponseData
>;

function adaptLegacyAdminMessages(payload: unknown): AdminMessagesResponseData {
  if (!isRecord(payload)) {
    throw new Error('Invalid admin messages payload');
  }
  if (Array.isArray(payload.messages)) {
    return { messages: payload.messages };
  }
  const { error } = payload;
  if (typeof error === 'string') {
    return { error };
  }
  throw new Error('Invalid admin messages payload');
}

export function createAdminMessagesResponse(
  data: AdminMessagesResponseData,
): AdminMessagesResponseEnvelope {
  return wrapEnvelope(ADMIN_MESSAGES_CONTRACT_VERSION, data);
}

export function parseAdminMessagesResponse(
  payload: unknown,
): AdminMessagesResponseData {
  return negotiateEnvelope<AdminMessagesResponseData>(payload, {
    latestVersion: ADMIN_MESSAGES_CONTRACT_VERSION,
    legacyAdapter: adaptLegacyAdminMessages,
  }).data;
}

// Terminal worker contract
export const TERMINAL_WORKER_CONTRACT_VERSION = 1 as const;

export interface TerminalRunRequestData {
  action: 'run';
  command: string;
  files?: Record<string, string>;
}

export type TerminalWorkerRequestEnvelope = VersionedEnvelope<
  typeof TERMINAL_WORKER_CONTRACT_VERSION,
  TerminalRunRequestData
>;

function adaptLegacyTerminalRequest(payload: unknown): TerminalRunRequestData {
  if (!isRecord(payload)) {
    throw new Error('Invalid terminal request');
  }
  const { action, command, files } = payload;
  if (action !== 'run' || typeof command !== 'string') {
    throw new Error('Invalid terminal request');
  }
  const result: TerminalRunRequestData = { action: 'run', command };
  if (isRecord(files)) {
    result.files = Object.fromEntries(
      Object.entries(files).filter(([, value]) => typeof value === 'string'),
    );
  }
  return result;
}

export function createTerminalRunRequest(
  data: TerminalRunRequestData,
): TerminalWorkerRequestEnvelope {
  return wrapEnvelope(TERMINAL_WORKER_CONTRACT_VERSION, data);
}

export function parseTerminalWorkerRequest(
  payload: unknown,
): TerminalRunRequestData {
  return negotiateEnvelope<TerminalRunRequestData>(payload, {
    latestVersion: TERMINAL_WORKER_CONTRACT_VERSION,
    legacyAdapter: adaptLegacyTerminalRequest,
  }).data;
}

export interface TerminalDataResponseData {
  type: 'data';
  chunk: string;
}

export interface TerminalEndResponseData {
  type: 'end';
}

export type TerminalWorkerResponseData =
  | TerminalDataResponseData
  | TerminalEndResponseData;

export type TerminalWorkerResponseEnvelope = VersionedEnvelope<
  typeof TERMINAL_WORKER_CONTRACT_VERSION,
  TerminalWorkerResponseData
>;

function adaptLegacyTerminalResponse(
  payload: unknown,
): TerminalWorkerResponseData {
  if (!isRecord(payload)) {
    throw new Error('Invalid terminal response');
  }
  const { type } = payload;
  if (type === 'data' && typeof (payload as any).chunk === 'string') {
    return { type: 'data', chunk: (payload as any).chunk };
  }
  if (type === 'end') {
    return { type: 'end' };
  }
  throw new Error('Invalid terminal response');
}

export function createTerminalWorkerResponse(
  data: TerminalWorkerResponseData,
): TerminalWorkerResponseEnvelope {
  return wrapEnvelope(TERMINAL_WORKER_CONTRACT_VERSION, data);
}

export function parseTerminalWorkerResponse(
  payload: unknown,
): TerminalWorkerResponseData {
  return negotiateEnvelope<TerminalWorkerResponseData>(payload, {
    latestVersion: TERMINAL_WORKER_CONTRACT_VERSION,
    legacyAdapter: adaptLegacyTerminalResponse,
  }).data;
}
