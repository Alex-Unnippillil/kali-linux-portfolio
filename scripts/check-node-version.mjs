import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptsDir, '..');

const nvmrcPath = resolve(projectRoot, '.nvmrc');
const packageJsonPath = resolve(projectRoot, 'package.json');

const expectedFromNvmrc = readFileSync(nvmrcPath, 'utf8').trim();
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const expectedFromPackage = packageJson?.engines?.node?.trim();
const runtimeVersion = process.version.startsWith('v')
  ? process.version.slice(1)
  : process.version;

const errors = [];

if (!expectedFromNvmrc) {
  errors.push('`.nvmrc` is empty; add the expected Node.js version.');
}

if (!expectedFromPackage) {
  errors.push('`package.json` is missing an `engines.node` entry.');
}

if (expectedFromPackage && expectedFromNvmrc && expectedFromPackage !== expectedFromNvmrc) {
  errors.push(
    `Mismatch between package.json engines (${expectedFromPackage}) and .nvmrc (${expectedFromNvmrc}).`
  );
}

if (expectedFromNvmrc && runtimeVersion !== expectedFromNvmrc) {
  errors.push(
    `Runtime Node.js version ${runtimeVersion} does not match .nvmrc expectation ${expectedFromNvmrc}.`
  );
}

if (expectedFromPackage && runtimeVersion !== expectedFromPackage) {
  errors.push(
    `Runtime Node.js version ${runtimeVersion} does not match package.json engines requirement ${expectedFromPackage}.`
  );
}

if (errors.length > 0) {
  errors.forEach((message) => {
    console.error(`::error::${message}`);
  });
  process.exit(1);
}

console.log(`Node.js version ${runtimeVersion} matches .nvmrc and package.json expectations.`);
