import { z } from 'zod';

export const translationContextSchema = z.object({
  section: z.string().min(1, 'Context section is required'),
  description: z.string().optional(),
  screenshot: z.string().optional(),
  notes: z.string().optional(),
});

export const translationChangeSchema = z.object({
  base: z.string(),
  value: z.string(),
  context: translationContextSchema,
});

export const translationExportSchema = z
  .object({
    language: z
      .string()
      .min(2, 'Language code must be at least 2 characters')
      .regex(/^[a-z]{2}(-[A-Z][a-z]+)?$/, 'Language code must follow BCP 47 like en or en-US'),
    namespace: z.string().min(1, 'Namespace is required'),
    generatedAt: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: 'generatedAt must be an ISO 8601 date',
      }),
    reviewer: z.string().optional(),
    changes: z.record(translationChangeSchema),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value.changes).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one translation change is required',
        path: ['changes'],
      });
    }
  });

export function summarizeChanges(changes) {
  return Object.entries(changes).map(([key, change]) => ({
    key,
    base: change.base,
    value: change.value,
    context: change.context,
  }));
}
