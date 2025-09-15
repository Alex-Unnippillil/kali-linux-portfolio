export async function detectArch(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  uaData: { getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }> } | undefined =
    typeof navigator !== 'undefined' ? (navigator as any).userAgentData : undefined
): Promise<string> {
  try {
    if (uaData?.getHighEntropyValues) {
      const { architecture } = await uaData.getHighEntropyValues(['architecture']);
      if (architecture) return architecture.toLowerCase();
    }
  } catch {
    // ignore failures and fall back to UA string
  }

  const source = ua.toLowerCase();
  if (/arm64|aarch64/.test(source)) return 'arm64';
  if (/arm/.test(source)) return 'arm';
  if (/x86_64|x64|win64|amd64/.test(source)) return 'x64';
  return 'unknown';
}
