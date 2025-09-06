export interface TumblerPlugin {
  id: string;
  generate: (file: string) => Promise<Buffer | null>;
}

export interface GenerateOptions {
  plugins: TumblerPlugin[];
  disabledPlugins?: Record<string, boolean>;
}

/**
 * Run through available plugins until one returns a thumbnail.
 * Disabled plugins are skipped.
 */
export async function generateThumbnail(
  file: string,
  { plugins, disabledPlugins = {} }: GenerateOptions
): Promise<Buffer | null> {
  for (const plugin of plugins) {
    if (disabledPlugins[plugin.id]) continue;
    try {
      const result = await plugin.generate(file);
      if (result) return result;
    } catch {
      // ignore plugin errors and try next
    }
  }
  return null;
}

