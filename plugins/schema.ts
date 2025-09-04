import { z } from 'zod';

const manifestV1 = z.object({
  version: z.literal(1),
  id: z.string(),
  sandbox: z.enum(['worker', 'iframe']),
  code: z.string(),
});

export const pluginManifest = z.discriminatedUnion('version', [manifestV1]);
export type PluginManifest = z.infer<typeof pluginManifest>;

export function validateManifest(data: unknown): PluginManifest {
  return pluginManifest.parse(data);
}
