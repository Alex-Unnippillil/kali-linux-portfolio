import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ExtensionLoader,
  ManifestParseError,
  ManifestValidationError,
} from '../../../utils/extensions/loader';

describe('ExtensionLoader', () => {
  let tempDir: string;

  const writeFile = (relativePath: string, content: string) => {
    const filePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  };

  const createManifest = (manifest: Record<string, unknown>) => {
    return writeFile('manifest.json', JSON.stringify(manifest, null, 2));
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extension-loader-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('loads, tracks, and unloads a valid extension', async () => {
    const loader = new ExtensionLoader({ rootDir: tempDir });
    const manifestPath = createManifest({
      name: 'demo-extension',
      version: '1.2.3',
      permissions: ['filesystem:read'],
      entry: './index.mjs',
    });

    writeFile(
      'index.mjs',
      `export let disposed = false;\nexport function dispose() { disposed = true; }\nexport const onLoad = () => 'ready';\n`
    );

    const loaded = await loader.loadFromFile(manifestPath);
    expect(loaded.manifest.name).toBe('demo-extension');
    expect(loader.get('demo-extension')).toBeDefined();
    expect(loader.list()).toHaveLength(1);

    await loader.unload('demo-extension');
    expect(loaded.module.disposed).toBe(true);
    expect(loader.get('demo-extension')).toBeUndefined();
    expect(loader.list()).toHaveLength(0);
  });

  test('raises manifest validation errors with field level context', async () => {
    const loader = new ExtensionLoader({ rootDir: tempDir });
    const manifestPath = createManifest({
      name: 'bad-extension',
      version: '1.0',
      permissions: [],
      entry: '/absolute/path.js',
    });

    await loader.loadFromFile(manifestPath).then(
      () => {
        throw new Error('Expected validation failure');
      },
      (error) => {
        expect(error).toBeInstanceOf(ManifestValidationError);
        const message = (error as Error).message;
        expect(message).toMatch(/version: Version must follow semantic versioning/i);
        expect(message).toMatch(/permissions: At least one permission must be declared/i);
        expect(message).toMatch(/entry: Entry must be a relative path without spaces/i);
      }
    );
  });

  test('prevents entry files from escaping the manifest directory', async () => {
    const loader = new ExtensionLoader({ rootDir: tempDir });
    const manifestPath = createManifest({
      name: 'escape-attempt',
      version: '1.0.0',
      permissions: ['demo:run'],
      entry: '../other.mjs',
    });

    await loader.loadFromFile(manifestPath).then(
      () => {
        throw new Error('Expected validation failure');
      },
      (error) => {
        expect(error).toBeInstanceOf(ManifestValidationError);
        expect((error as Error).message).toMatch(
          /Entry must be a relative path without spaces, leading slashes, or directory traversal/
        );
      }
    );
  });

  test('wraps JSON parse errors with descriptive context', async () => {
    const loader = new ExtensionLoader({ rootDir: tempDir });
    const manifestPath = writeFile('manifest.json', '{ invalid json ');

    await loader.loadFromFile(manifestPath).then(
      () => {
        throw new Error('Expected parse failure');
      },
      (error) => {
        expect(error).toBeInstanceOf(ManifestParseError);
        expect((error as Error).message).toMatch(/could not be parsed/);
      }
    );
  });
});
