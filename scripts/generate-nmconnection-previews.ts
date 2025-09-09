import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { toKeyfile, NMConnection } from '../utils/nmconnection';
import logger from '../utils/logger';


const dir = join(process.cwd(), 'data', 'network-connections');

const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const json = await readFile(join(dir, file), 'utf8');
  const data: NMConnection = JSON.parse(json);
  const ini = toKeyfile(data);
  const outFile = join(dir, `${basename(file, '.json')}.ini`);
  await writeFile(outFile, ini, 'utf8');
  logger.info(`Generated ${outFile}`);
}
