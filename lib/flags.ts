export async function beta(): Promise<boolean> {
  return process.env.NEXT_PUBLIC_BETA === 'true';
}
