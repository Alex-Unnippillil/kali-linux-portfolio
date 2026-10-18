"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const repo = path.resolve(process.env.SOURCE_REPO || process.cwd());
const fromRepo = createRequire(path.join(repo, "package.json"));
const yaml = fromRepo("js-yaml");
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "braces-verifier-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of [
    "package.json",
    "yarn.lock",
    "node_modules/.yarn-state.yml",
    ".yarn/patches/braces-npm-3.0.3-582c14023c.patch",
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(repo, file), path.join(root, file));
  }
  for (const name of ["braces", "js-yaml"])
    fs.cpSync(
      path.join(repo, "node_modules", name),
      path.join(root, "node_modules", name),
      { recursive: true },
    );
  for (const name of ["micromatch", "chokidar"]) {
    fs.mkdirSync(path.join(root, "node_modules", name), { recursive: true });
    fs.copyFileSync(
      path.join(repo, "node_modules", name, "package.json"),
      path.join(root, "node_modules", name, "package.json"),
    );
  }
  return root;
}
function verify(root) {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve(
        __dirname,
        "../../scripts/security/verify-braces-backport.cjs",
      ),
      root,
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  assert.equal(result.error, undefined);
  return result;
}
function changeJson(filename, fn) {
  const value = JSON.parse(fs.readFileSync(filename, "utf8"));
  fn(value);
  fs.writeFileSync(filename, JSON.stringify(value));
}
test("verifies exact patch, locked descriptors, every copy and both consumers", (t) => {
  const result = verify(fixture(t));
  assert.equal(result.status, 0, result.stderr);
  const inventory = JSON.parse(result.stdout);
  assert.deepEqual(inventory.copies, ["node_modules/braces"]);
  assert.deepEqual(inventory.consumers.map((x) => x.name).sort(), [
    "chokidar",
    "micromatch",
  ]);
});
test("rejects altered or missing installed backport code", (t) => {
  const root = fixture(t);
  fs.appendFileSync(
    path.join(root, "node_modules/braces/lib/parse.js"),
    "\n// altered\n",
  );
  assert.notEqual(verify(root).status, 0);
});
test("rejects patch artifact changes", (t) => {
  const root = fixture(t);
  fs.appendFileSync(
    path.join(root, ".yarn/patches/braces-npm-3.0.3-582c14023c.patch"),
    "\n",
  );
  assert.notEqual(verify(root).status, 0);
});
test("rejects an additional installed copy absent from Yarn state", (t) => {
  const root = fixture(t);
  fs.cpSync(
    path.join(root, "node_modules/braces"),
    path.join(root, "node_modules/extra/node_modules/braces"),
    { recursive: true },
  );
  assert.notEqual(verify(root).status, 0);
});
test("rejects removal of an override", (t) => {
  const root = fixture(t);
  changeJson(
    path.join(root, "package.json"),
    (pkg) => delete pkg.resolutions["braces@npm:~3.0.2"],
  );
  assert.notEqual(verify(root).status, 0);
});
test("rejects newly introduced unprotected lock descriptor", (t) => {
  const root = fixture(t);
  const filename = path.join(root, "yarn.lock");
  const lock = yaml.load(fs.readFileSync(filename, "utf8"));
  const entry = Object.values(lock).find((value) => value.dependencies?.braces);
  entry.dependencies.braces = "npm:^3.0.4";
  fs.writeFileSync(filename, yaml.dump(lock));
  assert.notEqual(verify(root).status, 0);
});
test("rejects an unpatched locator in installed state", (t) => {
  const root = fixture(t);
  const filename = path.join(root, "node_modules/.yarn-state.yml");
  const state = yaml.load(fs.readFileSync(filename, "utf8"));
  const key = Object.keys(state).find((key) => key.startsWith("braces@"));
  state["braces@npm:3.0.3"] = state[key];
  delete state[key];
  fs.writeFileSync(filename, yaml.dump(state));
  assert.notEqual(verify(root).status, 0);
});
