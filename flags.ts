export async function beta(): Promise<boolean> {
  return false;
}

export function reportValue(_name: string, _value: unknown): void {
  // no-op
}

export async function verifyAccess(
  _authHeader: string | null | undefined,
  _secret?: string,
): Promise<boolean> {
  return true;
}

export const version = '0.0.0';

export type ProviderData = {
  definitions: Record<string, unknown>;
  hints: { key: string; text: string }[];
};

