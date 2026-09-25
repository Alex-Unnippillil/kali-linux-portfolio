import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './service-client';

const SESSION_COOKIE = 'auth_session';
const EMAIL_VERIFY_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type UserRecord = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_email_verified: boolean;
  created_at?: string;
};

type SessionRecord = {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
};

type ProfileRecord = {
  user_id: string;
  display_name: string;
  bio: string;
  preferences: Record<string, unknown>;
};

type TokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  token_type: 'email_verification' | 'password_reset';
  expires_at: string;
  used_at: string | null;
};

const memory = {
  users: new Map<string, UserRecord>(),
  sessions: new Map<string, SessionRecord>(),
  profiles: new Map<string, ProfileRecord>(),
  tokens: new Map<string, TokenRecord>(),
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim().toLowerCase();

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) {
    return false;
  }
  const candidate = scryptSync(password, salt, 64);
  const existing = Buffer.from(hash, 'hex');
  if (existing.length !== candidate.length) {
    return false;
  }
  return timingSafeEqual(existing, candidate);
};

const getClient = (): SupabaseClient | null => getServiceClient();
const isMemoryEnabled = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

async function queryUserByEmailOrUsername(client: SupabaseClient, identifier: string) {
  const normalized = identifier.toLowerCase();
  const { data } = await client
    .from('app_users')
    .select('*')
    .or(`email.eq.${normalized},username.eq.${normalized}`)
    .maybeSingle();
  return (data as UserRecord | null) ?? null;
}

export async function findUserByIdentifier(identifier: string) {
  const client = getClient();
  if (client) {
    return queryUserByEmailOrUsername(client, identifier);
  }
  for (const user of memory.users.values()) {
    if (user.email === normalizeEmail(identifier) || user.username === normalizeUsername(identifier)) {
      return user;
    }
  }
  return null;
}

export async function createUser(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}) {
  const client = getClient();
  const userPayload = {
    username: normalizeUsername(input.username),
    email: normalizeEmail(input.email),
    password_hash: hashPassword(input.password),
    is_email_verified: false,
  };

  if (client) {
    const { data, error } = await client
      .from('app_users')
      .insert([userPayload])
      .select('*')
      .single();
    if (error) {
      return { user: null, error: error.message };
    }
    const user = data as UserRecord;
    await client.from('user_profiles').upsert([
      {
        user_id: user.id,
        display_name: input.displayName || input.username,
        bio: '',
        preferences: {},
      },
    ]);
    await ensureDefaultRole(user.id, client);
    return { user, error: null };
  }

  if (!isMemoryEnabled()) {
    return { user: null, error: 'auth_unavailable' };
  }
  const duplicate = await findUserByIdentifier(userPayload.email) ?? await findUserByIdentifier(userPayload.username);
  if (duplicate) {
    return { user: null, error: 'duplicate_user' };
  }
  const id = randomBytes(16).toString('hex');
  const user: UserRecord = { id, ...userPayload };
  memory.users.set(id, user);
  memory.profiles.set(id, {
    user_id: id,
    display_name: input.displayName || input.username,
    bio: '',
    preferences: {},
  });
  return { user, error: null };
}

async function ensureDefaultRole(userId: string, client: SupabaseClient) {
  const { data: role } = await client.from('user_roles_catalog').select('id').eq('slug', 'user').maybeSingle();
  if (role?.id) {
    await client.from('user_role_assignments').upsert([{ user_id: userId, role_id: role.id }]);
  }
}

export async function createOneTimeToken(userId: string, tokenType: TokenRecord['token_type']) {
  const rawToken = randomBytes(32).toString('hex');
  const token_hash = hashToken(rawToken);
  const ttl = tokenType === 'email_verification' ? EMAIL_VERIFY_TTL_MS : PASSWORD_RESET_TTL_MS;
  const expires_at = new Date(Date.now() + ttl).toISOString();
  const client = getClient();

  if (client) {
    const { error } = await client.from('auth_one_time_tokens').insert([
      {
        user_id: userId,
        token_hash,
        token_type: tokenType,
        expires_at,
      },
    ]);
    if (error) {
      return { token: null, error: error.message };
    }
    return { token: rawToken, error: null };
  }

  if (!isMemoryEnabled()) {
    return { token: null, error: 'auth_unavailable' };
  }
  const id = randomBytes(16).toString('hex');
  memory.tokens.set(id, { id, user_id: userId, token_hash, token_type: tokenType, expires_at, used_at: null });
  return { token: rawToken, error: null };
}

export async function consumeToken(rawToken: string, tokenType: TokenRecord['token_type']) {
  const token_hash = hashToken(rawToken);
  const client = getClient();
  const now = new Date().toISOString();

  if (client) {
    const { data } = await client
      .from('auth_one_time_tokens')
      .select('*')
      .eq('token_hash', token_hash)
      .eq('token_type', tokenType)
      .is('used_at', null)
      .gt('expires_at', now)
      .maybeSingle();
    if (!data) {
      return null;
    }
    await client.from('auth_one_time_tokens').update({ used_at: now }).eq('id', data.id);
    return data as TokenRecord;
  }

  for (const token of memory.tokens.values()) {
    if (
      token.token_hash === token_hash &&
      token.token_type === tokenType &&
      !token.used_at &&
      token.expires_at > now
    ) {
      token.used_at = now;
      return token;
    }
  }
  return null;
}

export async function markEmailVerified(userId: string) {
  const client = getClient();
  if (client) {
    await client.from('app_users').update({ is_email_verified: true }).eq('id', userId);
    return;
  }
  const user = memory.users.get(userId);
  if (user) user.is_email_verified = true;
}

export async function updatePassword(userId: string, nextPassword: string) {
  const password_hash = hashPassword(nextPassword);
  const client = getClient();
  if (client) {
    await client.from('app_users').update({ password_hash }).eq('id', userId);
    await client.from('auth_sessions').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null);
    return;
  }
  const user = memory.users.get(userId);
  if (user) user.password_hash = password_hash;
  for (const session of memory.sessions.values()) {
    if (session.user_id === userId && !session.revoked_at) session.revoked_at = new Date().toISOString();
  }
}

export async function createSession(userId: string) {
  const rawToken = randomBytes(48).toString('hex');
  const session_token_hash = hashToken(rawToken);
  const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const client = getClient();

  if (client) {
    const { error } = await client.from('auth_sessions').insert([{ user_id: userId, session_token_hash, expires_at }]);
    if (error) {
      return { token: null, error: error.message };
    }
    return { token: rawToken, error: null };
  }

  if (!isMemoryEnabled()) {
    return { token: null, error: 'auth_unavailable' };
  }
  const id = randomBytes(16).toString('hex');
  memory.sessions.set(id, { id, user_id: userId, session_token_hash, expires_at, revoked_at: null });
  return { token: rawToken, error: null };
}

export async function getUserBySessionToken(rawToken?: string | null) {
  if (!rawToken) return null;
  const sessionHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const client = getClient();

  if (client) {
    const { data: session } = await client
      .from('auth_sessions')
      .select('*')
      .eq('session_token_hash', sessionHash)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .maybeSingle();
    if (!session) return null;
    const { data: user } = await client.from('app_users').select('*').eq('id', session.user_id).maybeSingle();
    return (user as UserRecord | null) ?? null;
  }

  for (const session of memory.sessions.values()) {
    if (session.session_token_hash === sessionHash && !session.revoked_at && session.expires_at > now) {
      return memory.users.get(session.user_id) ?? null;
    }
  }
  return null;
}

export async function getProfile(userId: string) {
  const client = getClient();
  if (client) {
    const { data } = await client.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
    return (data as ProfileRecord | null) ?? null;
  }
  return memory.profiles.get(userId) ?? null;
}

export async function updateProfile(userId: string, patch: Partial<ProfileRecord>) {
  const client = getClient();
  if (client) {
    const payload = {
      user_id: userId,
      display_name: patch.display_name ?? '',
      bio: patch.bio ?? '',
      preferences: patch.preferences ?? {},
    };
    const { data } = await client.from('user_profiles').upsert([payload]).select('*').single();
    return data as ProfileRecord;
  }
  const existing = memory.profiles.get(userId) ?? {
    user_id: userId,
    display_name: '',
    bio: '',
    preferences: {},
  };
  const next = { ...existing, ...patch };
  memory.profiles.set(userId, next);
  return next;
}

export function getSessionCookieFromHeader(cookieHeader?: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((segment) => segment.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
}

export function createSessionCookie(token: string) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearSessionCookie() {
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}
