import { z } from 'zod';

const PowerProfileSchema = z.object({
  cpu: z.number().min(0).max(100).default(100),
  gpu: z.number().min(0).max(100).default(100),
});

const PowerSettingsSchema = z.object({
  ac: PowerProfileSchema,
  battery: PowerProfileSchema,
});

export type PowerProfile = z.infer<typeof PowerProfileSchema>;
export type PowerSettings = z.infer<typeof PowerSettingsSchema>;

