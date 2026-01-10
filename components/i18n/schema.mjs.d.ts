import type { z } from 'zod';

export const translationContextSchema: z.ZodObject<{
  section: z.ZodString;
  description: z.ZodOptional<z.ZodString>;
  screenshot: z.ZodOptional<z.ZodString>;
  notes: z.ZodOptional<z.ZodString>;
}>;

export const translationChangeSchema: z.ZodObject<{
  base: z.ZodString;
  value: z.ZodString;
  context: typeof translationContextSchema;
}>;

export const translationExportSchema: z.ZodEffects<
  z.ZodObject<{
    language: z.ZodEffects<
      z.ZodString,
      string,
      string
    >;
    namespace: z.ZodString;
    generatedAt: z.ZodString;
    reviewer: z.ZodOptional<z.ZodString>;
    changes: z.ZodRecord<z.ZodString, typeof translationChangeSchema>;
  }>,
  {
    language: string;
    namespace: string;
    generatedAt: string;
    reviewer?: string | undefined;
    changes: Record<
      string,
      {
        base: string;
        value: string;
        context: {
          section: string;
          description?: string | undefined;
          screenshot?: string | undefined;
          notes?: string | undefined;
        };
      }
    >;
  },
  {
    language: string;
    namespace: string;
    generatedAt: string;
    reviewer?: string | undefined;
    changes: Record<
      string,
      {
        base: string;
        value: string;
        context: {
          section: string;
          description?: string | undefined;
          screenshot?: string | undefined;
          notes?: string | undefined;
        };
      }
    >;
  }
>;

export type TranslationContext = z.infer<typeof translationContextSchema>;
export type TranslationChange = z.infer<typeof translationChangeSchema>;
export type TranslationExport = z.infer<typeof translationExportSchema>;

export function summarizeChanges(
  changes: Record<string, TranslationChange>
): Array<{
  key: string;
  base: string;
  value: string;
  context: TranslationContext;
}>;
