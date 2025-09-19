import { z, ZodErrorMap, ZodIssueCode } from 'zod';

import type { Translator } from '../i18n';

type MessageDescriptor = string | { key: string; values?: Record<string, unknown> };

type MaybePromise<T> = T | Promise<T>;

type FieldRule<T extends Record<string, unknown>, K extends keyof T> = (
  value: T[K],
  data: T,
) => MaybePromise<MessageDescriptor | null | undefined>;

type FieldRuleMap<T extends Record<string, unknown>> = Partial<{
  [K in keyof T]: Array<FieldRule<T, K>>;
}>;

export type FieldErrors<T extends Record<string, unknown>> = Partial<{
  [K in keyof T]: string;
}>;

export interface ValidationResult<T extends Record<string, unknown>> {
  data?: T;
  errors: FieldErrors<T>;
}

export interface FieldValidationResult<
  T extends Record<string, unknown>,
  K extends keyof T,
> {
  value?: T[K];
  errors: FieldErrors<T>;
}

export interface ValidatorOptions<T extends Record<string, unknown>> {
  schema: z.ZodObject<any, any, any, T>;
  t: Translator;
  fieldLabels?: Partial<Record<keyof T, string>>;
  syncRules?: FieldRuleMap<T>;
  asyncRules?: FieldRuleMap<T>;
}

export interface FormValidator<T extends Record<string, unknown>> {
  validate: (data: T) => Promise<ValidationResult<T>>;
  validateField: <K extends keyof T>(
    field: K,
    value: T[K],
    currentData: T,
  ) => Promise<FieldValidationResult<T, K>>;
}

const resolveDescriptor = (
  descriptor: MessageDescriptor,
  t: Translator,
  defaultFieldLabel?: string,
) => {
  if (typeof descriptor === 'string') {
    return t(descriptor, defaultFieldLabel ? { field: defaultFieldLabel } : undefined);
  }
  const values = {
    ...(descriptor.values || {}),
    ...(defaultFieldLabel ? { field: defaultFieldLabel } : {}),
  };
  return t(descriptor.key, values);
};

const getFieldLabel = <T extends Record<string, unknown>>(
  field: keyof T,
  t: Translator,
  labels: Partial<Record<keyof T, string>>,
) => {
  const key = labels[field];
  if (!key) return String(field);
  return t(key);
};

const createErrorMap = <T extends Record<string, unknown>>(
  t: Translator,
  fieldLabels: Partial<Record<keyof T, string>>,
): ZodErrorMap => {
  return (issue, ctx) => {
    const path = issue.path?.[0] as keyof T | undefined;
    const fieldLabel = path !== undefined ? getFieldLabel(path, t, fieldLabels) : undefined;

    const fallback = () => t('validation.errors.generic');

    if (issue.code === ZodIssueCode.invalid_type) {
      if (issue.received === 'undefined') {
        return {
          message: t('validation.errors.required', { field: fieldLabel }),
        };
      }
      return {
        message: t('validation.errors.generic'),
      };
    }

    if (issue.code === ZodIssueCode.too_small) {
      if (issue.type === 'string') {
        return {
          message: t('validation.errors.minLength', {
            field: fieldLabel,
            count: issue.minimum,
          }),
        };
      }
      return { message: fallback() };
    }

    if (issue.code === ZodIssueCode.too_big) {
      if (issue.type === 'string') {
        return {
          message: t('validation.errors.maxLength', {
            field: fieldLabel,
            count: issue.maximum,
          }),
        };
      }
      return { message: fallback() };
    }

    if (issue.code === ZodIssueCode.invalid_string) {
      if (issue.validation === 'email') {
        return {
          message: t('validation.errors.email', { field: fieldLabel }),
        };
      }
      if (issue.validation === 'regex') {
        return {
          message: t('validation.errors.pattern', { field: fieldLabel }),
        };
      }
      return { message: fallback() };
    }

    if (issue.code === ZodIssueCode.custom) {
      if (issue.message) {
        return { message: issue.message };
      }
      const key = (issue.params as { i18nKey?: string; values?: Record<string, unknown> } | undefined)?.i18nKey;
      if (key) {
        return {
          message: t(key, {
            ...(issue.params as Record<string, unknown> | undefined)?.values,
            field: fieldLabel,
          }),
        };
      }
      return { message: fallback() };
    }

    if (issue.message && issue.message !== ctx.defaultError) {
      return { message: issue.message };
    }

    return { message: fallback() };
  };
};

const collectErrors = <T extends Record<string, unknown>>(
  issues: z.ZodIssue[],
): FieldErrors<T> => {
  return issues.reduce<FieldErrors<T>>((acc, issue) => {
    const key = issue.path?.[0] as keyof T | undefined;
    if (key !== undefined && typeof issue.message === 'string') {
      if (!acc[key]) acc[key] = issue.message;
    }
    return acc;
  }, {});
};

const runRules = async <T extends Record<string, unknown>, K extends keyof T>(
  rules: Array<FieldRule<T, K>> | undefined,
  value: T[K],
  data: T,
  t: Translator,
  fieldLabel?: string,
): Promise<string | undefined> => {
  if (!rules) return undefined;
  for (const rule of rules) {
    const result = await rule(value, data);
    if (result) {
      return resolveDescriptor(result, t, fieldLabel);
    }
  }
  return undefined;
};

export const createFormValidator = <T extends Record<string, unknown>>({
  schema,
  t,
  fieldLabels = {},
  syncRules = {},
  asyncRules = {},
}: ValidatorOptions<T>): FormValidator<T> => {
  const errorMap = createErrorMap<T>(t, fieldLabels);

  const fieldSchemaCache = new Map<keyof T, z.ZodObject<any>>();

  const ensureFieldSchema = (field: keyof T) => {
    if (fieldSchemaCache.has(field)) return fieldSchemaCache.get(field)!;
    const picked = schema.pick({ [field]: true } as Record<keyof T, true>);
    fieldSchemaCache.set(field, picked as z.ZodObject<any>);
    return picked as z.ZodObject<any>;
  };

  const validator: FormValidator<T> = {
    async validate(data) {
      const parsed = await schema.safeParseAsync(data, { errorMap });
      if (!parsed.success) {
        return {
          errors: collectErrors<T>(parsed.error.issues),
        };
      }

      const values = parsed.data;
      const errors: FieldErrors<T> = {};

      for (const key of Object.keys(syncRules) as Array<keyof T>) {
        const message = await runRules(
          syncRules[key],
          values[key],
          values,
          t,
          getFieldLabel(key, t, fieldLabels),
        );
        if (message) {
          errors[key] = message;
        }
      }

      for (const key of Object.keys(asyncRules) as Array<keyof T>) {
        if (errors[key]) continue;
        const message = await runRules(
          asyncRules[key],
          values[key],
          values,
          t,
          getFieldLabel(key, t, fieldLabels),
        );
        if (message) {
          errors[key] = message;
        }
      }

      if (Object.keys(errors).length > 0) {
        return { errors };
      }

      return { data: values, errors };
    },

    async validateField(field, value, currentData) {
      const fieldSchema = ensureFieldSchema(field);
      const parsed = await fieldSchema.safeParseAsync({ [field]: value }, { errorMap });
      if (!parsed.success) {
        return {
          errors: collectErrors<T>(parsed.error.issues),
        };
      }

      const nextValue = parsed.data[field];
      const merged = {
        ...currentData,
        [field]: nextValue,
      } as T;

      const fieldLabel = getFieldLabel(field, t, fieldLabels);

      const syncMessage = await runRules(
        syncRules[field],
        nextValue,
        merged,
        t,
        fieldLabel,
      );
      if (syncMessage) {
        return {
          errors: {
            [field]: syncMessage,
          } as FieldErrors<T>,
        };
      }

      const asyncMessage = await runRules(
        asyncRules[field],
        nextValue,
        merged,
        t,
        fieldLabel,
      );
      if (asyncMessage) {
        return {
          errors: {
            [field]: asyncMessage,
          } as FieldErrors<T>,
        };
      }

      return {
        value: nextValue,
        errors: {} as FieldErrors<T>,
      };
    },
  };

  return validator;
};

