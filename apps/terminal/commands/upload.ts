import type { CommandContext } from './types';

type SaveData = Blob | ArrayBuffer | ArrayBufferView | string;

type ShowOpenFilePicker = (
  options?: OpenFilePickerOptions,
) => Promise<FileSystemFileHandle[]>;

interface FilePickerWindow extends Window {
  showOpenFilePicker?: ShowOpenFilePicker;
}

export async function saveToOPFS(path: string, data: SaveData): Promise<void> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.getDirectory !== 'function'
  ) {
    throw new Error('OPFS not supported');
  }

  const segments = path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length) {
    throw new Error('Invalid path');
  }

  const fileName = segments.pop();
  if (!fileName) throw new Error('Invalid path');

  const root = await navigator.storage.getDirectory();
  let dir: FileSystemDirectoryHandle = root;

  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }

  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();

  await writable.write(data);
  await writable.close();
}

export async function cmdUpload(
  _args: string,
  ctx: CommandContext,
): Promise<void> {
  if (typeof window === 'undefined') {
    ctx.writeLine('Upload is only available in the browser.');
    return;
  }

  const picker = (window as FilePickerWindow).showOpenFilePicker;
  if (!picker) {
    ctx.writeLine('File picker not supported in this browser.');
    return;
  }

  try {
    const [fileHandle] = await picker({ multiple: false });
    if (!fileHandle) {
      ctx.writeLine('No file selected.');
      return;
    }

    const file = await fileHandle.getFile();
    await saveToOPFS(`Downloads/${file.name}`, file);

    ctx.writeLine(`Saved ${file.name} to Downloads/${file.name}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      ctx.writeLine('Upload cancelled.');
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    ctx.writeLine(`Upload failed: ${message}`);
  }
}

export default cmdUpload;
