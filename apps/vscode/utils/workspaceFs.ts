export interface WorkspaceFile {
  handle: FileSystemFileHandle;
  name: string;
  content: string;
}

export async function openWorkspaceFile(): Promise<WorkspaceFile | null> {
  try {
    const [handle] = await window.showOpenFilePicker();
    const file = await handle.getFile();
    const content = await file.text();
    return { handle, name: handle.name, content };
  } catch {
    return null;
  }
}

export async function saveWorkspaceFile(handle: FileSystemFileHandle, content: string) {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}
