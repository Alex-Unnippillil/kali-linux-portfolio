import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { z } from 'zod';

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const permissionScopeRegex = /^[a-z]+(?::[a-zA-Z0-9._-]+)*$/;
const entryPathCharacters = /^[A-Za-z0-9@._/-]+$/;

const manifestSchema = z
  .object({
    name: z
      .string({ required_error: 'Extension name is required.' })
      .min(1, 'Extension name is required.')
      .max(120, 'Extension name must be 120 characters or fewer.')
      .refine((value) => !/^\s/.test(value), 'Extension name cannot begin with whitespace.'),
    version: z
      .string({ required_error: 'Extension version is required.' })
      .regex(semverRegex, 'Version must follow semantic versioning (MAJOR.MINOR.PATCH).'),
    description: z
      .string()
      .max(280, 'Description must be 280 characters or fewer.')
      .optional(),
    permissions: z
      .array(
        z
          .string({ required_error: 'Permission entries must be strings.' })
          .min(1, 'Permissions cannot include empty entries.')
          .regex(
            permissionScopeRegex,
            'Permissions must use the format "domain" or "domain:capability" and only include letters, numbers, period, dash or underscore.'
          )
      , {
        required_error: 'At least one permission must be declared.',
      }
      )
      .nonempty('At least one permission must be declared.')
      .refine((value) => new Set(value).size === value.length, 'Permissions must be unique.'),
    entry: z
      .string({ required_error: 'Entry file is required.' })
      .min(1, 'Entry file is required.')
      .superRefine((value, ctx) => {
        const message = 'Entry must be a relative path without spaces, leading slashes, or directory traversal.';
        if (/\s/.test(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }
        if (value.startsWith('/')) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }
        const segments = value.split(/[\\/]/).filter(Boolean);
        if (segments.some((segment) => segment === '..')) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }
        const sanitized = value.startsWith('./') ? value.slice(2) : value;
        if (!entryPathCharacters.test(sanitized)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }
        if (value.includes('//')) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }
      })
      .refine((value) => !path.isAbsolute(value), 'Entry must be a relative path.'),
    config: z.record(z.unknown()).optional(),
  })
  .strict();

export type ExtensionManifest = z.infer<typeof manifestSchema>;

export interface ExtensionModule {
  dispose?: () => void | Promise<void>;
  [key: string]: unknown;
}

export interface LoadedExtension {
  manifest: ExtensionManifest;
  module: ExtensionModule;
  entryPath: string;
}

export interface ExtensionLoaderOptions {
  /**
   * Restrict manifests and entry files to live within this directory. Defaults to the manifest directory.
   */
  rootDir?: string;
}

export class ManifestValidationError extends Error {
  public readonly issues: string[];

  constructor(manifestPath: string, issues: string[]) {
    const detail = issues.map((issue) => ` - ${issue}`).join('\n');
    super(`Manifest at ${manifestPath} is invalid:\n${detail}`);
    this.name = 'ManifestValidationError';
    this.issues = issues;
  }
}

export class ManifestParseError extends Error {
  constructor(manifestPath: string, message: string) {
    super(`Manifest at ${manifestPath} could not be parsed: ${message}`);
    this.name = 'ManifestParseError';
  }
}

export class ExtensionLoader {
  private readonly rootDir?: string;
  private readonly loaded = new Map<string, LoadedExtension>();

  constructor(options: ExtensionLoaderOptions = {}) {
    this.rootDir = options.rootDir ? path.resolve(options.rootDir) : undefined;
  }

  async parseManifest(manifestPath: string): Promise<ExtensionManifest> {
    let raw: string;
    try {
      raw = await fs.readFile(manifestPath, 'utf8');
    } catch (error) {
      if (error instanceof Error) {
        throw new ManifestParseError(manifestPath, error.message);
      }
      throw error;
    }

    let manifest: unknown;
    try {
      manifest = JSON.parse(raw);
    } catch (error) {
      if (error instanceof Error) {
        throw new ManifestParseError(manifestPath, error.message);
      }
      throw error;
    }

    return this.validateManifest(manifest, manifestPath);
  }

  validateManifest(manifest: unknown, manifestPath = 'manifest'): ExtensionManifest {
    const result = manifestSchema.safeParse(manifest);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => {
        const pathLabel = issue.path.length > 0 ? issue.path.join('.') : 'manifest';
        return `${pathLabel}: ${issue.message}`;
      });
      throw new ManifestValidationError(manifestPath, issues);
    }

    return result.data;
  }

  async loadFromFile(manifestPath: string): Promise<LoadedExtension> {
    const resolvedManifestPath = path.resolve(manifestPath);
    this.assertWithinRoot(resolvedManifestPath, resolvedManifestPath, 'Manifest');

    const manifest = await this.parseManifest(resolvedManifestPath);
    if (this.loaded.has(manifest.name)) {
      throw new Error(`Extension \"${manifest.name}\" is already loaded.`);
    }

    const entryPath = this.resolveEntryPath(resolvedManifestPath, manifest.entry);
    const module = (await import(pathToFileURL(entryPath).href)) as ExtensionModule;

    const loadedExtension: LoadedExtension = { manifest, module, entryPath };
    this.loaded.set(manifest.name, loadedExtension);
    return loadedExtension;
  }

  async unload(name: string): Promise<boolean> {
    const entry = this.loaded.get(name);
    if (!entry) {
      return false;
    }

    const disposer = entry.module?.dispose;
    if (typeof disposer === 'function') {
      await disposer.call(entry.module);
    }

    this.loaded.delete(name);
    return true;
  }

  get(name: string): LoadedExtension | undefined {
    return this.loaded.get(name);
  }

  list(): LoadedExtension[] {
    return Array.from(this.loaded.values());
  }

  private resolveEntryPath(manifestPath: string, entry: string): string {
    const manifestDir = path.dirname(manifestPath);
    const baseDir = this.rootDir ?? manifestDir;
    const resolved = path.resolve(manifestDir, entry);
    this.assertWithin(resolved, manifestDir, manifestPath, 'Entry path');
    this.assertWithinRoot(resolved, manifestPath, 'Entry path', baseDir);
    return resolved;
  }

  private assertWithin(targetPath: string, expectedRoot: string, manifestPath: string, description: string): void {
    const normalizedTarget = path.normalize(targetPath);
    const normalizedRoot = path.normalize(expectedRoot);
    if (!normalizedTarget.startsWith(normalizedRoot + path.sep) && normalizedTarget !== normalizedRoot) {
      throw new ManifestValidationError(manifestPath, [`${description} resolves outside of ${normalizedRoot}.`]);
    }
  }

  private assertWithinRoot(
    targetPath: string,
    manifestPath: string,
    description: string,
    rootOverride?: string
  ): void {
    if (!this.rootDir && !rootOverride) {
      return;
    }

    const base = path.normalize(rootOverride ?? this.rootDir!);
    const normalizedTarget = path.normalize(targetPath);
    if (!normalizedTarget.startsWith(base + path.sep) && normalizedTarget !== base) {
      throw new ManifestValidationError(manifestPath, [`${description} must be inside ${base}.`]);
    }
  }
}
