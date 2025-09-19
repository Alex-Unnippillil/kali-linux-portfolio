import { readFile } from 'node:fs/promises';
import process from 'node:process';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [nvmrcRaw, packageJsonRaw] = await Promise.all([
  readFile('.nvmrc', 'utf8'),
  readFile('package.json', 'utf8'),
]);

const requiredVersion = nvmrcRaw.trim();
if (!requiredVersion) {
  fail('Unable to read a Node version from .nvmrc. Populate the file with the desired version (e.g. 20.19.5).');
}

let packageJson;
try {
  packageJson = JSON.parse(packageJsonRaw);
} catch (error) {
  fail(`Failed to parse package.json: ${error.message}`);
}

const enginesNode = packageJson?.engines?.node?.trim();
if (!enginesNode) {
  fail('package.json is missing an "engines.node" declaration. Add the required Node version to keep tooling in sync.');
}

if (requiredVersion !== enginesNode) {
  fail(
    `Node version mismatch. .nvmrc requires ${requiredVersion} but package.json#engines.node declares ${enginesNode}. Update both to the same version.`,
  );
}

const runtimeVersion = process.versions?.node;
if (runtimeVersion && runtimeVersion !== requiredVersion) {
  fail(
    `Local Node runtime is ${runtimeVersion}, but the project requires ${requiredVersion}. Run "nvm use" or install Node ${requiredVersion} before continuing.`,
  );
}

console.log(`Node version check passed: ${requiredVersion}`);
