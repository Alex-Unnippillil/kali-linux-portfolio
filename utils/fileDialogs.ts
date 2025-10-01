import defaultTemplates from '../templates/export/report-templates.json';
import { defaults as settingsDefaults } from './settingsStore';

export interface FileDialogSample {
  label: string;
  description?: string;
  fileName: string;
  mimeType: string;
  successMessage?: string;
  getContent: () => Promise<string>;
}

export interface FileDialogConstraint {
  key: string;
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  types?: FilePickerAcceptType[];
  pickerOptions?: Omit<FilePickerOptions, 'types'>;
  suggestedName?: string;
  multiple?: boolean;
  errorMessages?: {
    invalidType?: string;
    tooLarge?: string;
  };
  sampleData?: FileDialogSample;
}

export interface FallbackFileHandle {
  name: string;
  kind: 'file';
  getFile: () => Promise<File>;
}

export type FileDialogConstraintKey = keyof typeof FILE_DIALOG_CONSTRAINTS;

export class FileDialogError extends Error {
  readonly code: 'invalid-type' | 'too-large' | 'not-supported';

  readonly constraint?: FileDialogConstraint;

  constructor(
    message: string,
    code: 'invalid-type' | 'too-large' | 'not-supported',
    constraint?: FileDialogConstraint,
  ) {
    super(message);
    this.name = 'FileDialogError';
    this.code = code;
    this.constraint = constraint;
  }
}

const DEFAULT_OPEN_OPTIONS: FilePickerOptions = {
  multiple: false,
};

const normalizeExtensions = (extensions: string[] = []) =>
  extensions.map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const buildAcceptAttribute = (types?: FilePickerAcceptType[]) => {
  if (!types?.length) return '';
  const tokens: string[] = [];
  types.forEach((type) => {
    if (!type.accept) return;
    Object.entries(type.accept).forEach(([mime, extensions]) => {
      if (mime) tokens.push(mime);
      extensions?.forEach((ext) => tokens.push(ext));
    });
  });
  return tokens.join(',');
};

const validateFileAgainstConstraint = (file: File, constraint: FileDialogConstraint) => {
  const { allowedMimeTypes = [], allowedExtensions = [], maxSize, errorMessages } = constraint;
  const normalizedExts = normalizeExtensions(allowedExtensions);
  const lowerName = (file.name || '').toLowerCase();
  const hasExt = normalizedExts.length
    ? normalizedExts.some((ext) => lowerName.endsWith(ext))
    : true;
  const normalizedTypes = allowedMimeTypes.map((type) => type.toLowerCase());
  const hasMime = normalizedTypes.length
    ? !!file.type && normalizedTypes.includes(file.type.toLowerCase())
    : true;

  const typeValid = normalizedTypes.length && normalizedExts.length ? hasMime || hasExt : hasMime && hasExt;

  if (!typeValid) {
    throw new FileDialogError(
      errorMessages?.invalidType ||
        `Select a file that matches ${[
          ...normalizedTypes,
          ...normalizedExts,
        ]
          .filter(Boolean)
          .join(', ')}.`,
      'invalid-type',
      constraint,
    );
  }

  if (maxSize && file.size > maxSize) {
    throw new FileDialogError(
      errorMessages?.tooLarge ||
        `The selected file is larger than the ${formatBytes(maxSize)} limit.`,
      'too-large',
      constraint,
    );
  }
};

const resolveConstraint = (key: FileDialogConstraintKey): FileDialogConstraint => {
  const constraint = FILE_DIALOG_CONSTRAINTS[key];
  if (!constraint) {
    throw new Error(`Unknown file dialog constraint: ${key}`);
  }
  return constraint;
};

const isConstraint = (
  value: unknown,
): value is FileDialogConstraint =>
  !!value && typeof value === 'object' && typeof (value as FileDialogConstraint).key === 'string';

type PickerKind = 'open' | 'save';

type SaveOptions = SaveFilePickerOptions;

interface ResolvedOptions<T> {
  constraint?: FileDialogConstraint;
  options: T;
}

const normalizeOptions = (
  kind: PickerKind,
  constraintOrOptions?: FileDialogConstraintKey | FileDialogConstraint | FilePickerOptions | SaveOptions,
  overrides?: FilePickerOptions | SaveOptions,
): ResolvedOptions<FilePickerOptions | SaveOptions> => {
  let constraint: FileDialogConstraint | undefined;
  let options: FilePickerOptions | SaveOptions = kind === 'open' ? { ...DEFAULT_OPEN_OPTIONS } : {};

  if (typeof constraintOrOptions === 'string') {
    constraint = resolveConstraint(constraintOrOptions);
  } else if (isConstraint(constraintOrOptions)) {
    constraint = constraintOrOptions;
  } else if (constraintOrOptions) {
    options = { ...constraintOrOptions } as FilePickerOptions | SaveOptions;
  }

  if (constraint) {
    if (constraint.pickerOptions) {
      options = { ...constraint.pickerOptions, ...options };
    }
    if (constraint.types && !(options as FilePickerOptions | SaveOptions).types) {
      (options as FilePickerOptions | SaveOptions).types = constraint.types;
    }
    if (typeof constraint.multiple === 'boolean' && typeof (options as FilePickerOptions).multiple === 'undefined') {
      (options as FilePickerOptions).multiple = constraint.multiple;
    }
    if (kind === 'save' && constraint.suggestedName && !(options as SaveOptions).suggestedName) {
      (options as SaveOptions).suggestedName = constraint.suggestedName;
    }
  }

  if (overrides) {
    options = { ...options, ...overrides };
  }

  return { constraint, options };
};

const ensureClientEnvironment = (constraint?: FileDialogConstraint) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new FileDialogError(
      'File dialogs are not available in this environment.',
      'not-supported',
      constraint,
    );
  }
};

const withValidation = async (
  handle: FileSystemFileHandle | FallbackFileHandle,
  constraint?: FileDialogConstraint,
) => {
  if (!constraint) return handle;
  const file = await handle.getFile();
  validateFileAgainstConstraint(file, constraint);
  return handle;
};

export async function openFileDialog(
  constraintOrOptions?: FileDialogConstraintKey | FileDialogConstraint | FilePickerOptions,
  overrides?: FilePickerOptions,
): Promise<FileSystemFileHandle | FallbackFileHandle | null> {
  const { constraint, options } = normalizeOptions('open', constraintOrOptions, overrides);

  ensureClientEnvironment(constraint);

  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker(options as FilePickerOptions);
      if (!handle) return null;
      await withValidation(handle, constraint);
      return handle;
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  return await new Promise<FileSystemFileHandle | FallbackFileHandle | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.position = 'fixed';
    input.style.left = '-9999px';

    const accept = buildAcceptAttribute((options as FilePickerOptions).types);
    if (accept) input.accept = accept;
    if ((options as FilePickerOptions).multiple) input.multiple = true;

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener('change', async () => {
      const [file] = Array.from(input.files || []);
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      const fallbackHandle: FallbackFileHandle = {
        name: file.name,
        kind: 'file',
        async getFile() {
          return file;
        },
      };
      try {
        await withValidation(fallbackHandle, constraint);
        resolve(fallbackHandle);
      } catch (err) {
        reject(err);
      }
    });

    input.addEventListener('cancel', () => {
      cleanup();
      resolve(null);
    });

    document.body.appendChild(input);
    input.click();
  });
}

export async function saveFileDialog(
  constraintOrOptions?: FileDialogConstraintKey | FileDialogConstraint | SaveOptions,
  overrides?: SaveOptions,
): Promise<FileSystemFileHandle | {
  name: string;
  createWritable: () => Promise<{
    write: (data: BlobPart | Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}> {
  const { constraint, options } = normalizeOptions('save', constraintOrOptions, overrides);

  ensureClientEnvironment(constraint);

  if (window.showSaveFilePicker) {
    return await window.showSaveFilePicker(options as SaveOptions);
  }

  const suggestedName =
    (options as SaveOptions).suggestedName || constraint?.suggestedName || 'download';

  return {
    name: suggestedName,
    async createWritable() {
      return {
        async write(data: BlobPart | Blob) {
          const blob = data instanceof Blob ? data : new Blob([data]);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = suggestedName;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        async close() {
          /* no-op */
        },
      };
    },
  };
}

export const FILE_DIALOG_CONSTRAINTS: Record<
  'settings' | 'reconTemplates',
  FileDialogConstraint
> = {
  settings: {
    key: 'settings',
    maxSize: 200 * 1024,
    allowedMimeTypes: ['application/json'],
    allowedExtensions: ['.json'],
    types: [
      {
        description: 'Kali desktop settings',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
    pickerOptions: {
      excludeAcceptAllOption: true,
      multiple: false,
    },
    suggestedName: 'settings.json',
    errorMessages: {
      invalidType: 'Settings imports must be JSON exports from the Kali desktop.',
      tooLarge: 'Settings files must be smaller than 200 KB.',
    },
    sampleData: {
      label: 'Use sample settings',
      description: 'Restore the default wallpaper, accent colour, and accessibility options.',
      fileName: 'kali-settings-sample.json',
      mimeType: 'application/json',
      successMessage: 'Loaded sample desktop settings.',
      async getContent() {
        return JSON.stringify(
          {
            ...settingsDefaults,
            theme: 'default',
            useKaliWallpaper: false,
          },
          null,
          2,
        );
      },
    },
  },
  reconTemplates: {
    key: 'reconTemplates',
    maxSize: 256 * 1024,
    allowedMimeTypes: ['application/json'],
    allowedExtensions: ['.json'],
    types: [
      {
        description: 'Recon report templates',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
    pickerOptions: {
      excludeAcceptAllOption: true,
      multiple: false,
    },
    errorMessages: {
      invalidType: 'Report templates must be provided as a JSON export.',
      tooLarge: 'Template bundles must be smaller than 256 KB.',
    },
    sampleData: {
      label: 'Load sample templates',
      description: 'Revert to the curated recon templates shipped with the desktop demo.',
      fileName: 'recon-report-templates.json',
      mimeType: 'application/json',
      successMessage: 'Restored sample report templates.',
      async getContent() {
        return JSON.stringify(defaultTemplates, null, 2);
      },
    },
  },
};

export const getFileDialogConstraint = (key: FileDialogConstraintKey) =>
  resolveConstraint(key);

export type { FileDialogConstraint as FileDialogConstraintConfig };
