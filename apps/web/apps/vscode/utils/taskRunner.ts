const PROJECT_DIR = 'vscode';

export interface Task {
  label: string;
  command: string;
  language?: string;
}

export async function loadTasks(project: string, language: string): Promise<Task[]> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(PROJECT_DIR);
    const proj = await dir.getDirectoryHandle(project);
    const file = await proj.getFileHandle('tasks.json');
    const text = await (await file.getFile()).text();
    const json = JSON.parse(text);
    const tasks: Task[] = Array.isArray(json.tasks) ? json.tasks : [];
    return tasks.filter((t) => !t.language || t.language === language);
  } catch {
    return [];
  }
}

export async function runTask(task: Task): Promise<string> {
  try {
    // tiny tasks: execute command as Function
    const fn = new Function(task.command);
    const result = await fn();
    if (typeof result === 'string') return result;
    return JSON.stringify(result);
  } catch (e) {
    return `Error: ${(e as Error).message}`;
  }
}
