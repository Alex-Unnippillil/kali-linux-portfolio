"use strict";
// Fail-closed verification of the exact installed backport before audit classification.
// Usage: node verify-braces-backport.cjs /path/to/repository
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createRequire } = require("node:module");
const root = fs.realpathSync(path.resolve(process.argv[2] || process.cwd()));
const fromRoot = createRequire(path.join(root, "package.json"));
// Explicit development dependency; absence causes failure rather than weaker parsing.
const yaml = fromRoot("js-yaml");
const patchPath = ".yarn/patches/braces-npm-3.0.3-582c14023c.patch";
const descriptor = `patch:braces@npm%3A3.0.3#~/${patchPath}`;
const locator = `braces@${descriptor}::version=3.0.3&hash=89abc7`;
const hashes = {
  "index.js":
    "332ea07c7b006361aad12aa994ca75dc1db8e8382b884909e2f38f10b85c88a4",
  "package.json":
    "56f08b888a4f30dc7cf8a7dbb36ffe92b737912ba36abe9d069d32167c957ac7",
  "lib/compile.js":
    "ab37cf0094a4fd313e689deaf0d2437e949402928f5dc89b539c906af013dc4b",
  "lib/constants.js":
    "f9fb688959232eee3e6ad7906a5b0e3234815db49ee857ef86983d65b917dc7c",
  "lib/expand.js":
    "bff03cce16decf00a9c19180260337a8ecee7ef178c56bb36c8378a6bf1c2592",
  "lib/parse.js":
    "86bb8dd13bb6dd1c047fbc23db37faa7fb0f9eea0d0e6faf6719d7ad007866da",
  "lib/stringify.js":
    "07554a0c033d068fa13de5268847c7412c73493d180f11c0033e60a40e2aafd8",
  "lib/utils.js":
    "cef20c299a6e278c2f856848766e64f4cc1c9c2d89129b54d1c7e1007fc03d23",
};
const sha = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
assert.equal(
  sha(path.join(root, patchPath)),
  "0b671c8527467f468b1ac62394aa3e894e7d34c1c7d32da9dcf4a87d59bf0e1d",
  "Backport patch changed",
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const expectedRanges = ["npm:^3.0.3", "npm:~3.0.2"];
const overrides = Object.entries(manifest.resolutions || {}).filter(
  ([key]) => key === "braces" || key.startsWith("braces@"),
);
assert.deepEqual(
  overrides.map(([key]) => key).sort(),
  expectedRanges.map((range) => "braces@" + range).sort(),
  "Unexpected braces overrides",
);
for (const [, target] of overrides)
  assert.equal(
    target,
    descriptor,
    "A braces range is not protected by the reviewed patch",
  );
const lock = yaml.load(fs.readFileSync(path.join(root, "yarn.lock"), "utf8"));
const braceEntries = Object.entries(lock).filter(([key]) =>
  key.startsWith("braces@"),
);
assert.deepEqual(
  braceEntries.map(([key]) => key).sort(),
  ["braces@npm:3.0.3", "braces@" + descriptor].sort(),
  "Unexpected braces lock entries",
);
for (const [key, value] of braceEntries) {
  assert.equal(value.version, "3.0.3");
  assert.equal(value.resolution, key === "braces@npm:3.0.3" ? key : locator);
  assert.deepEqual(value.dependencies, { "fill-range": "npm:^7.1.1" });
}
let lockedConsumers = 0;
for (const [key, value] of Object.entries(lock)) {
  if (value.dependencies && Object.hasOwn(value.dependencies, "braces")) {
    assert(
      expectedRanges.includes(value.dependencies.braces),
      `Unprotected braces descriptor in ${key}`,
    );
    lockedConsumers++;
  }
}
assert(lockedConsumers > 0, "No braces dependents found in lockfile");
const state = yaml.load(
  fs.readFileSync(path.join(root, "node_modules/.yarn-state.yml"), "utf8"),
);
const stateBraces = Object.entries(state).filter(([key]) =>
  key.startsWith("braces@"),
);
assert.equal(stateBraces.length, 1, "Unexpected installed braces locators");
assert.equal(
  stateBraces[0][0],
  locator,
  "Installed locator does not match reviewed backport",
);
assert(
  !stateBraces[0][1].aliases || stateBraces[0][1].aliases.length === 0,
  "Unexpected braces locator aliases",
);
const stateLocations = stateBraces[0][1].locations
  .map((location) => fs.realpathSync(path.join(root, location)))
  .sort();
assert(stateLocations.length > 0, "No installed braces locations");
const copies = new Set();
const consumers = [];
const visited = new Set();
function scan(dir) {
  const real = fs.realpathSync(dir);
  if (visited.has(real)) return;
  assert(
    real === root || real.startsWith(root + path.sep),
    "Dependency link escapes repository",
  );
  visited.add(real);
  const filename = path.join(real, "package.json");
  if (fs.existsSync(filename)) {
    const pkg = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (pkg.name === "braces") copies.add(real);
    if (pkg.dependencies?.braces || pkg.optionalDependencies?.braces) {
      const resolved = fs.realpathSync(
        createRequire(filename).resolve("braces"),
      );
      consumers.push({
        name: pkg.name,
        path: path.relative(root, real),
        resolved: path.dirname(resolved),
      });
    }
  }
  for (const entry of fs.readdirSync(real, { withFileTypes: true })) {
    if (entry.name === ".bin") continue;
    const child = path.join(real, entry.name);
    if (
      entry.isDirectory() ||
      (entry.isSymbolicLink() && fs.statSync(child).isDirectory())
    )
      scan(child);
  }
}
scan(path.join(root, "node_modules"));
assert.deepEqual(
  [...copies].sort(),
  [...new Set(stateLocations)].sort(),
  "Installed braces copies and Yarn state disagree",
);
for (const directory of copies) {
  for (const [file, hash] of Object.entries(hashes))
    assert.equal(
      sha(path.join(directory, file)),
      hash,
      `Unexpected code in ${directory}/${file}`,
    );
  const actualFiles = fs
    .readdirSync(path.join(directory, "lib"))
    .filter((name) => name.endsWith(".js"))
    .sort();
  assert.deepEqual(
    actualFiles,
    Object.keys(hashes)
      .filter((file) => file.startsWith("lib/"))
      .map((file) => file.slice(4))
      .sort(),
    "Unexpected braces source modules",
  );
}
assert(consumers.length > 0, "No installed braces consumers");
for (const consumer of consumers)
  assert(
    copies.has(consumer.resolved),
    `Unprotected braces resolution from ${consumer.name}`,
  );
console.log(
  JSON.stringify(
    {
      status: "verified-backport",
      package: "braces",
      version: "3.0.3",
      advisory: "GHSA-vfj7-8cjw-p6xm",
      locator,
      lockedConsumers,
      copies: [...copies].map((file) => path.relative(root, file)),
      consumers,
    },
    null,
    2,
  ),
);
