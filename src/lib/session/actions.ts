export interface SessionAction {
  id: string;
  label: string;
  /** Optional confirmation message */
  confirm?: string;
}

/**
 * Fetch available session actions from the API.
 */
export async function listSessionActions(): Promise<SessionAction[]> {
  try {
    const res = await fetch('/api/session/actions');
    if (!res.ok) throw new Error('Failed to fetch actions');
    const data = await res.json();
    // Support either array response or {actions: []}
    return Array.isArray(data) ? data : data.actions || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

/**
 * Execute a specific session action by id.
 */
export async function executeSessionAction(id: string): Promise<void> {
  const res = await fetch(`/api/session/actions/${id}`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to execute action');
  }
}
