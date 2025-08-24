export interface FileGuardOptions {
  maxSize?: number;
  mimeTypes?: string[];
}

/**
 * Guard a file's size and MIME type.
 * Throws an error if the file violates provided constraints.
 */
export function guardFile(
  file: { size: number; type: string },
  { maxSize, mimeTypes }: FileGuardOptions = {}
): true {
  if (typeof file.size !== 'number' || typeof file.type !== 'string') {
    throw new Error('Invalid file');
  }
  if (maxSize && file.size > maxSize) {
    throw new Error('File too large');
  }
  if (mimeTypes && mimeTypes.length && !mimeTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  return true;
}
