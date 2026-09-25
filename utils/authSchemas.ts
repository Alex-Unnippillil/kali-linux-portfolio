import { z } from 'zod';

const passwordPolicy = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email().max(254),
  password: passwordPolicy,
  displayName: z.string().min(2).max(60).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(3).max(254),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(256),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  newPassword: passwordPolicy,
});

export const profilePatchSchema = z.object({
  display_name: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).optional(),
  preferences: z.record(z.any()).optional(),
});
