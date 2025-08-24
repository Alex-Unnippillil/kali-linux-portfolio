import * as Comlink from 'comlink';
import sshpk from 'sshpk';

function convert(key: string, format: 'pem' | 'ssh'): string {
  try {
    const parsed = sshpk.parseKey(key, 'auto');
    return parsed.toString(format);
  } catch (error) {
    // Return a meaningful error message for debugging
   return `Error converting key: ${error instanceof Error ? error.message : String(error)}`;
 }
}

Comlink.expose({ convert });
