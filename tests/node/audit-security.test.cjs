"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  MITIGATED,
  parseYarn,
  patchInventory,
  parseBulk,
  classify,
} = require("../../scripts/security/audit-security.cjs");
// Captured Yarn 4.9.2 JSONL structure, kept as a stable regression fixture.
const source = {
  value: "braces",
  children: {
    ID: 1240992,
    Issue:
      "braces vulnerable to stack-exhaustion denial of service through deeply nested patterns",
    URL: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
    Severity: "high",
    "Vulnerable Versions": "<=3.0.3",
    "Tree Versions": ["3.0.3"],
    Dependents: ["micromatch@npm:4.0.8"],
  },
};
const raw = JSON.stringify(source);
const item = {
  id: MITIGATED.id,
  title: source.children.Issue,
  url: MITIGATED.url,
  severity: "high",
  vulnerable_versions: MITIGATED.range,
};
const current = () => parseBulk({ braces: [{ ...item }] });

test("parses actual Yarn JSONL advisory output without hiding it", () => {
  const parsed = parseYarn(raw + "\n", 1);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].url, MITIGATED.url);
});
test("accepts valid empty or informational Yarn success", () => {
  assert.deepEqual(parseYarn("", 0), []);
  assert.deepEqual(
    parseYarn('{"type":"info","data":"No audit suggestions"}\n', 0),
    [],
  );
});
test("does not reinterpret network/parser/exit failures as success", () => {
  for (const [stdout, status] of [
    ["", 1],
    [raw, 0],
    ["", 2],
    ["not json", 0],
    ['{"type":"error","data":"registry unavailable"}', 1],
    ["{}", 0],
  ]) {
    assert.throws(() => parseYarn(stdout, status));
  }
});
test("exact registry advisory is mitigated only after verification", () => {
  assert.equal(classify(current(), true).mitigated.length, 1);
  assert.equal(classify(current(), false).blocked.length, 1);
});
test("new high and critical braces advisories remain blocking", () => {
  for (const severity of ["high", "critical"]) {
    const advisories = parseBulk({
      braces: [
        {
          ...item,
          id: 9876543,
          severity,
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
        },
      ],
    });
    assert.equal(classify(advisories, true).blocked.length, 1);
  }
});
test("same advisory with changed ID, range, severity, package or versions fails closed", () => {
  for (const change of [
    { issue: "Changed advisory description" },
    { id: 9876543 },
    { range: "<=3.0.4" },
    { severity: "critical" },
    { package: "other" },
    { versions: ["3.0.2"] },
    { versions: ["3.0.2", "3.0.3"] },
  ]) {
    assert.equal(
      classify([{ ...current()[0], ...change }], true).blocked.length,
      1,
    );
  }
});
test("unrelated Yarn high finding remains blocking", () => {
  const other = structuredClone(source);
  other.value = "other";
  other.children.ID = 9876543;
  other.children.URL = "https://github.com/advisories/GHSA-aaaa-bbbb-cccc";
  const result = classify(
    [...current(), ...parseYarn(JSON.stringify(other), 1)],
    true,
  );
  assert.equal(result.mitigated.length, 1);
  assert.equal(result.blocked.length, 1);
});
test("npm bulk errors and malformed advisories fail closed", () => {
  for (const data of [
    null,
    [],
    { error: "not available" },
    { other: [] },
    { braces: {} },
    { braces: [{}] },
    { braces: [{ ...item, severity: "unknown" }] },
    { braces: [{ ...item, id: "1240992" }] },
  ])
    assert.throws(() => parseBulk(data));
});
test("honors existing high/critical threshold without losing raw records", () => {
  const parsed = parseBulk({
    braces: [{ ...item, id: 99999, severity: "moderate" }],
  });
  assert.equal(parsed.length, 1);
  assert.equal(classify(parsed, true).blocked.length, 0);
  assert.equal(classify(parsed, true).mitigated.length, 0);
  assert.deepEqual(parseBulk({}), []);
});

const patch = (name, version, source = `${name}@npm%3A${version}`) => ({
  version,
  resolution: `${name}@patch:${source}#builtin<compat/test>`,
});
test("supplemental inventory includes every npm patch source and version", () => {
  const inventory = patchInventory({
    a: patch("braces", "3.0.3"),
    b: patch("fsevents", "2.3.2"),
    c: patch("fsevents", "2.3.3"),
    d: patch("resolve", "2.0.0-next.5"),
    e: patch("typescript", "5.8.2"),
  });
  assert.deepEqual(
    { ...inventory },
    {
      braces: ["3.0.3"],
      fsevents: ["2.3.2", "2.3.3"],
      resolve: ["2.0.0-next.5"],
      typescript: ["5.8.2"],
    },
  );
  const findings = parseBulk(
    { typescript: [{ ...item, id: 9876543 }] },
    inventory,
  );
  assert.deepEqual(findings[0].versions, ["5.8.2"]);
  assert.equal(classify(findings, true).blocked.length, 1);
});
test("unknown or mismatched patch sources fail closed", () => {
  for (const entry of [
    patch("other", "1.0.0", "other@git%3Aabcdef"),
    patch("other", "1.0.0", "other@npm%3A2.0.0"),
    patch("other", "1.0.0", "other@npm%3A^1.0.0"),
  ]) {
    assert.throws(() =>
      patchInventory({ braces: patch("braces", "3.0.3"), other: entry }),
    );
  }
  assert.throws(() => patchInventory({}));
});
