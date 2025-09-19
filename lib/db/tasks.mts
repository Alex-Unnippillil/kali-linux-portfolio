const STORAGE_KEY = 'portfolio-tasks';

export async function loadTasks(): Promise<any | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as any) : undefined;
  } catch {
    return undefined;
  }
}

export async function saveTasks(data: any): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore errors
  }
}
