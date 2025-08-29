export type ProjectType = 'node' | 'python' | 'unknown';

export interface ExtensionRecommendation {
  id: string;
  name: string;
}

async function fileExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

export async function scanProjectType(project: string): Promise<ProjectType> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('vscode');
    const proj = await dir.getDirectoryHandle(project);
    if (await fileExists(proj, 'package.json')) return 'node';
    if (await fileExists(proj, 'requirements.txt')) return 'python';
  } catch {
    /* ignore */
  }
  return 'unknown';
}

export function getRecommendations(type: ProjectType): ExtensionRecommendation[] {
  switch (type) {
    case 'node':
      return [
        { id: 'dbaeumer.vscode-eslint', name: 'ESLint' },
        { id: 'esbenp.prettier-vscode', name: 'Prettier' },
      ];
    case 'python':
      return [{ id: 'ms-python.python', name: 'Python' }];
    default:
      return [];
  }
}
