export function serverOnly(moduleName: string): void {
  const isBrowser = typeof window !== 'undefined' || typeof document !== 'undefined';
  if (isBrowser) {
    throw new Error(`${moduleName} is only available on the server.`);
  }

  const runtime =
    typeof process !== 'undefined' && process && 'env' in process
      ? (process as NodeJS.Process).env?.NEXT_RUNTIME
      : undefined;

  if (runtime && runtime !== 'nodejs') {
    throw new Error(`${moduleName} is not supported in the ${runtime} runtime.`);
  }
}
