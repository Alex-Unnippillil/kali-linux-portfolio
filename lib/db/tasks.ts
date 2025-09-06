import { isBrowser } from '@/utils/env';
const STORAGE_KEY = 'portfolio-tasks';

export async function loadTasks(): Promise<any | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as any) : undefined;
  } catch {
    return undefined;
  }
}

export async function saveTasks(data: any): Promise<void> {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore errors
  }
}
