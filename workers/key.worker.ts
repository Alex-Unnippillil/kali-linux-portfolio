import * as Comlink from 'comlink';
import sshpk from 'sshpk';

function convert(key: string, format: 'pem' | 'ssh'): string {
  const parsed = sshpk.parseKey(key, 'auto');
  return parsed.toString(format);
}

Comlink.expose({ convert });
