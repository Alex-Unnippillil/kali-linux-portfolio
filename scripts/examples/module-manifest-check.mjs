import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const subnetPath = path.join(__dirname, '../../modules/networking/subnet.ts');
const source = await fs.readFile(subnetPath, 'utf8');

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
  fileName: subnetPath,
});

const sandbox = {
  exports: {},
  module: { exports: {} },
  require,
  console,
};

vm.runInNewContext(transpiled.outputText, sandbox, { filename: subnetPath });

const exported = { ...sandbox.module.exports, ...sandbox.exports };
const { calculateSubnetInfo } = exported;

if (typeof calculateSubnetInfo !== 'function') {
  throw new Error('calculateSubnetInfo is not exported from modules/networking/subnet.ts');
}

const info = calculateSubnetInfo('10.10.5.25', 24);
if (info.network !== '10.10.5.0' || info.broadcast !== '10.10.5.255') {
  throw new Error(`Unexpected subnet calculation result: ${JSON.stringify(info)}`);
}

console.log('[module-manifest] subnet.ts transpiled and executed successfully.');
