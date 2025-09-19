import { z } from 'zod';
import rawFeatureFlags from '../data/feature-flags.json';

type FeatureFlagType = 'boolean' | 'string' | 'number';

const FeatureFlagSchema = z
  .object({
    id: z.string().min(1, 'Feature flag ids cannot be empty'),
    type: z.enum(['boolean', 'string', 'number']),
    default: z.union([z.boolean(), z.string(), z.number()]),
    description: z.string().min(1, 'Feature flag descriptions cannot be empty'),
  })
  .superRefine((flag, ctx) => {
    switch (flag.type) {
      case 'boolean':
        if (typeof flag.default !== 'boolean') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Default for boolean flag "${flag.id}" must be a boolean`,
            path: ['default'],
          });
        }
        break;
      case 'number':
        if (typeof flag.default !== 'number') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Default for number flag "${flag.id}" must be a number`,
            path: ['default'],
          });
        }
        break;
      case 'string':
        if (typeof flag.default !== 'string') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Default for string flag "${flag.id}" must be a string`,
            path: ['default'],
          });
        }
        break;
      default:
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported flag type ${(flag as { type: FeatureFlagType }).type}`,
          path: ['type'],
        });
    }
  });

const FeatureFlagRegistrySchema = z
  .array(FeatureFlagSchema)
  .superRefine((flags, ctx) => {
    const seen = new Set<string>();
    flags.forEach((flag, index) => {
      if (seen.has(flag.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate feature flag id "${flag.id}"`,
          path: [index, 'id'],
        });
      }
      seen.add(flag.id);
    });
  });

export type FeatureFlagDefinition = z.infer<typeof FeatureFlagSchema>;
export type FeatureFlagId = FeatureFlagDefinition['id'];
export type FeatureFlagKind = FeatureFlagDefinition['type'];

type FeatureFlagValueType<T extends FeatureFlagKind> = T extends 'boolean'
  ? boolean
  : T extends 'number'
    ? number
    : string;

const parsedRegistry = FeatureFlagRegistrySchema.parse(rawFeatureFlags);

export const featureFlagRegistry = Object.freeze(
  parsedRegistry.map((flag) => Object.freeze(flag))
) as ReadonlyArray<FeatureFlagDefinition>;

export type FeatureFlags = {
  [Id in FeatureFlagId]: FeatureFlagValueType<Extract<FeatureFlagDefinition, { id: Id }>['type']>;
};

export const featureFlagIds = featureFlagRegistry.map((flag) => flag.id) as FeatureFlagId[];

export function isFeatureFlagId(value: string): value is FeatureFlagId {
  return featureFlagRegistry.some((flag) => flag.id === value);
}
