import { z } from 'zod';

export const proofOfWorkSchema = z.object({
  nonce: z.string().trim().min(1).max(256),
  timestamp: z
    .coerce.number()
    .refine((value) => Number.isFinite(value), 'Invalid timestamp'),
  digest: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i, 'Invalid digest'),
});

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .transform((v) => v.replace(/\s+/g, ' ')),
  email: z.string().trim().email(),
  message: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .transform((v) => v.replace(/\s+/g, ' ')),
  honeypot: z.string().max(0),
  csrfToken: z.string().min(1),
  recaptchaToken: z.string().min(1).optional(),
  proofOfWork: proofOfWorkSchema.optional(),
});
