import JSZip from 'jszip';
import type { ThemeDefinition } from '../../../styles/themes';
import { validateThemeDefinition } from '../../../utils/themeTokens';

export const THEME_ARCHIVE_FILENAME = 'theme.json';

const serializeTheme = (theme: ThemeDefinition): string =>
  JSON.stringify(theme, null, 2);

export const createThemeArchive = async (theme: ThemeDefinition): Promise<Blob> => {
  const zip = new JSZip();
  zip.file(THEME_ARCHIVE_FILENAME, serializeTheme(theme));
  return zip.generateAsync({ type: 'blob' });
};

const toArrayBuffer = async (input: ArrayBuffer | Blob): Promise<ArrayBuffer> => {
  if (input instanceof Blob) {
    if (typeof input.arrayBuffer === 'function') {
      return input.arrayBuffer();
    }
    if (typeof FileReader === 'function') {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            reject(new Error('Failed to read theme archive.'));
          }
        };
        reader.onerror = () => {
          reject(reader.error ?? new Error('Failed to read theme archive.'));
        };
        reader.readAsArrayBuffer(input);
      });
    }
    return new Response(input).arrayBuffer();
  }
  return input;
};

export const parseThemeArchive = async (
  input: ArrayBuffer | Blob,
): Promise<ThemeDefinition> => {
  const data = await toArrayBuffer(input);
  const zip = await JSZip.loadAsync(data);
  const entry = zip.file(THEME_ARCHIVE_FILENAME);
  if (!entry) {
    throw new Error('Theme archive missing theme.json');
  }
  let parsed: unknown;
  try {
    const raw = await entry.async('string');
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('Theme archive contains invalid JSON');
  }
  const validation = validateThemeDefinition(parsed);
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }
  return parsed as ThemeDefinition;
};
