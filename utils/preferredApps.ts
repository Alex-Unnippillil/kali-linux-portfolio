export function getDefaultTerminal(): string {
  if (typeof window === 'undefined') return 'terminal';
  return window.localStorage.getItem('default-terminal') || 'terminal';
}

export function setDefaultTerminal(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('default-terminal', id);
}
