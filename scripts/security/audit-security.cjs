"use strict";
// Retain registry findings; accept only the verified, bounded-depth braces backport.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const yaml = require("js-yaml");

const MITIGATED = {
  package: "braces",
  id: 1240992,
  url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  severity: "high",
  range: "<=3.0.3",
  version: "3.0.3",
  issue:
    "braces vulnerable to stack-exhaustion denial of service through deeply nested patterns",
};
const SEVERITIES = new Set(["info", "low", "moderate", "high", "critical"]);
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function record({ package: name, id, url, severity, range, versions, issue }) {
  assert(typeof name === "string" && name.length > 0, "Missing audit package");
  assert(Number.isSafeInteger(id) && id > 0, "Invalid advisory ID");
  assert(
    typeof url === "string" && /^https:\/\//.test(url),
    "Invalid advisory URL",
  );
  assert(SEVERITIES.has(severity), "Unknown advisory severity");
  assert(
    typeof range === "string" && range.length > 0,
    "Missing vulnerable range",
  );
  assert(
    Array.isArray(versions) &&
      versions.length > 0 &&
      versions.every((v) => typeof v === "string"),
    "Missing affected versions",
  );
  assert(
    typeof issue === "string" && issue.length > 0,
    "Missing issue description",
  );
  return { package: name, id, url, severity, range, versions, issue };
}
function parseYarn(stdout, status) {
  assert(
    status === 0 || status === 1,
    `Yarn audit failed with status ${status}`,
  );
  const records = [];
  for (const line of stdout.split(/\r?\n/).filter((line) => line.trim())) {
    let item;
    try {
      item = JSON.parse(line);
    } catch {
      throw new Error("Malformed Yarn audit JSON");
    }
    // Yarn may emit no output, or this exact informational success diagnostic.
    if (item?.type === "info" && item.data === "No audit suggestions") continue;
    assert(
      item && typeof item === "object" && !Array.isArray(item),
      "Invalid Yarn audit record",
    );
    const c = item.children;
    assert(
      c && typeof c === "object" && !Array.isArray(c),
      "Yarn audit error or unsupported diagnostic",
    );
    assert(
      Array.isArray(c.Dependents) &&
        c.Dependents.every((v) => typeof v === "string"),
      "Invalid audit dependents",
    );
    records.push(
      record({
        package: item.value,
        id: c.ID,
        issue: c.Issue,
        url: c.URL,
        severity: c.Severity,
        range: c["Vulnerable Versions"],
        versions: c["Tree Versions"],
      }),
    );
  }
  assert(
    status === (records.length ? 1 : 0),
    "Yarn audit output and exit status disagree",
  );
  return records;
}
function patchInventory(lock) {
  assert(
    lock && typeof lock === "object" && !Array.isArray(lock),
    "Invalid lockfile",
  );
  const inventory = Object.create(null);
  for (const entry of Object.values(lock)) {
    const resolution = entry?.resolution;
    if (typeof resolution !== "string" || !resolution.includes("@patch:"))
      continue;
    const match = resolution.match(/^(.+?)@patch:([^#]+)#/);
    assert(match, "Unsupported patched package locator");
    const name = match[1];
    const source = decodeURIComponent(match[2]);
    const prefix = `${name}@npm:`;
    assert(source.startsWith(prefix), `Unsupported patched source: ${name}`);
    const version = source.slice(prefix.length);
    assert(
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version),
      "Unpinned patched source",
    );
    assert(
      version === entry.version,
      `Patched source version mismatch: ${name}`,
    );
    inventory[name] ||= [];
    if (!inventory[name].includes(version)) inventory[name].push(version);
  }
  assert(
    inventory.braces?.length === 1 && inventory.braces[0] === MITIGATED.version,
    "Missing verified braces audit source",
  );
  return inventory;
}
function parseBulk(payload, inventory = { braces: [MITIGATED.version] }) {
  assert(
    payload && typeof payload === "object" && !Array.isArray(payload),
    "Invalid npm bulk response",
  );
  const records = [];
  for (const [name, advisories] of Object.entries(payload)) {
    assert(
      Object.hasOwn(inventory, name) && Array.isArray(advisories),
      "Unexpected npm bulk package or error response",
    );
    for (const item of advisories) {
      assert(
        item && typeof item === "object" && !Array.isArray(item),
        "Invalid npm bulk advisory",
      );
      records.push(
        record({
          package: name,
          id: item.id,
          issue: item.title,
          url: item.url,
          severity: item.severity,
          range: item.vulnerable_versions,
          versions: inventory[name],
        }),
      );
    }
  }
  return records;
}
function classify(records, backportVerified) {
  const result = { blocked: [], mitigated: [] };
  for (const item of records) {
    if (!["high", "critical"].includes(item.severity)) continue;
    const exact =
      backportVerified &&
      item.package === MITIGATED.package &&
      item.id === MITIGATED.id &&
      item.url === MITIGATED.url &&
      item.severity === MITIGATED.severity &&
      item.range === MITIGATED.range &&
      item.issue === MITIGATED.issue &&
      item.versions.length === 1 &&
      item.versions[0] === MITIGATED.version;
    result[exact ? "mitigated" : "blocked"].push(item);
  }
  return result;
}

async function main() {
  const root = path.resolve(process.argv[2] || process.cwd());
  const scripts = path.dirname(__filename);
  const yarn = path.join(root, ".yarn/releases/yarn-4.9.2.cjs");
  const artifact = path.resolve(
    root,
    process.env.DEPENDENCY_AUDIT_LOG || "dependency-audit.log",
  );
  const command = (filename, args, timeout = 30000) => {
    const result = spawnSync(process.execPath, [filename, ...args], {
      cwd: root,
      encoding: "utf8",
      timeout,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    return result;
  };
  // Verify actual files, every installed copy, manifest overrides, lock entries and parent resolution.
  for (const [filename, args] of [
    ["verify-braces-backport.cjs", [root]],
    [
      "braces-depth-regression.cjs",
      [
        path.join(root, "node_modules/braces/index.js"),
        path.join(root, "node_modules/micromatch/index.js"),
      ],
    ],
  ]) {
    const result = command(path.join(scripts, filename), args);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    assert(result.status === 0, `${filename} failed; no advisory is waived`);
  }
  // Refuse inherited/configured package exclusions or advisory ignores.
  for (const option of [
    "npmAuditIgnoreAdvisories",
    "npmAuditExcludePackages",
  ]) {
    const result = command(yarn, ["config", "get", option, "--json"]);
    assert(result.status === 0, `Cannot verify ${option}`);
    let value;
    try {
      value = JSON.parse(result.stdout);
    } catch {
      throw new Error(`Cannot parse ${option}`);
    }
    assert(
      Array.isArray(value) && value.length === 0,
      `${option} must be empty`,
    );
  }
  console.log(
    "Auditing all dependencies, including npm sources behind Yarn patches...",
  );
  const audit = command(
    yarn,
    ["npm", "audit", "--all", "--recursive", "--severity", "high", "--json"],
    180000,
  );
  fs.writeFileSync(
    artifact,
    `=== Unfiltered Yarn high/critical audit ===\n${audit.stdout}\n${audit.stderr}`,
  );
  const yarnRecords = parseYarn(audit.stdout, audit.status);
  // Yarn 4.9.2 omits patch: locators from its registry package list. Query the
  // original identities explicitly, including Yarn's built-in compatibility patches.
  const inventory = patchInventory(
    yaml.load(fs.readFileSync(path.join(root, "yarn.lock"), "utf8")),
  );
  const response = await fetch(
    "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(inventory),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    },
  );
  assert(response.ok, `npm bulk audit failed: HTTP ${response.status}`);
  const bulkText = await response.text();
  assert(
    bulkText.length <= 1024 * 1024,
    "npm bulk audit response exceeds limit",
  );
  fs.appendFileSync(
    artifact,
    `\n=== Unfiltered npm audit for all patched npm sources ===\n${bulkText}\n`,
  );
  const bulkRecords = parseBulk(JSON.parse(bulkText), inventory);
  const report = classify([...yarnRecords, ...bulkRecords], true);
  const summary = {
    status: report.blocked.length
      ? "FAIL"
      : report.mitigated.length
        ? "PASS_WITH_VERIFIED_BACKPORT"
        : "PASS",
    remainingRegistryAdvisory: report.mitigated.length ? MITIGATED.url : null,
    mitigated: [...new Set(report.mitigated.map((item) => item.url))],
    blocked: report.blocked,
  };
  fs.appendFileSync(
    artifact,
    `\n=== Gate decision ===\n${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  if (report.blocked.length) process.exitCode = 1;
}
if (require.main === module)
  main().catch((error) => {
    console.error(`Security gate failed closed: ${error.message}`);
    process.exitCode = 1;
  });
module.exports = {
  MITIGATED,
  record,
  parseYarn,
  patchInventory,
  parseBulk,
  classify,
};
