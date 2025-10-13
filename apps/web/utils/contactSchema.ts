import { z } from 'zod';

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
  recaptchaToken: z.string().min(1),
});
