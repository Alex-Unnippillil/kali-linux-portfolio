"use strict";

// Usage: node braces-depth-regression.cjs [braces entry] [micromatch entry] [baseline braces entry]
// Each group runs in a restricted-stack child with a hard timeout. No network is used.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const bracesEntry = process.argv[2]
  ? resolve(process.argv[2])
  : require.resolve("braces");
const micromatchEntry = process.argv[3]
  ? resolve(process.argv[3])
  : require.resolve("micromatch");
const baselineEntry = process.argv[4] ? resolve(process.argv[4]) : null;
let passed = 0;
const bootstrap = `
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { realpathSync } = require('node:fs');
const braces = require(${JSON.stringify(bracesEntry)});
const requireBraces = createRequire(${JSON.stringify(bracesEntry)});
const guard = (fn, Type = SyntaxError) => assert.throws(fn, error => {
  assert(error instanceof Type, error && error.stack);
  assert.match(error.message, /(?:Input|AST)(?: parent| array)? depth.*exceeds max depth|AST parent chain contains a cycle/);
  assert.doesNotMatch(error.message, /Maximum call stack/);
  return true;
});
const makeAst = (depth, kind = 'brace') => {
  let node = { type: 'text', value: 'x' };
  for (let i = 0; i < depth; i++) {
    const parent = { type: kind, open: true, close: true, commas: 1, ranges: 0, nodes: [node] };
    node.parent = parent;
    node = parent;
  }
  const root = { type: 'root', nodes: [node] };
  node.parent = root;
  return root;
};
`;
function run(name, body, { timeout = 5000 } = {}) {
  const child = spawnSync(
    process.execPath,
    ["--stack-size=512", "-e", bootstrap + body],
    {
      encoding: "utf8",
      timeout,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  assert.equal(child.error, undefined, `${name}: ${child.error}`);
  assert.equal(child.status, 0, `${name}: ${child.stderr || child.stdout}`);
  passed++;
  console.log(`PASS ${name}`);
}

run(
  "deep brace, parenthesis and mixed strings reject across public entry points",
  `
const patterns = [
  '{'.repeat(4000) + 'x' + '}'.repeat(4000),
  '('.repeat(4000) + 'x' + ')'.repeat(4000),
  '{('.repeat(1900) + 'x' + ')}'.repeat(1900),
];
for (const pattern of patterns) {
  assert(pattern.length < 10000);
  for (const call of [braces, braces.create, braces.parse, braces.compile, braces.expand, braces.stringify]) {
    guard(() => call(pattern));
    guard(() => call(pattern, { maxDepth: Infinity, maxLength: Infinity }));
    guard(() => call(pattern, { maxDepth: 50000 }));
  }
}
guard(() => braces(['normal', patterns[0]]));
`,
);

run(
  "unmatched nested containers are bounded during parsing",
  `
for (const pattern of ['{'.repeat(4000), '('.repeat(4000), '{('.repeat(1900)]) {
  guard(() => braces.parse(pattern));
  guard(() => braces(pattern));
}
`,
);

run(
  "depth boundary preserves 100 containers and rejects 101",
  `
for (const [open, close] of [['{', '}'], ['(', ')']]) {
  const allowed = open.repeat(100) + 'x' + close.repeat(100);
  for (const call of [braces.parse, braces.compile, braces.expand, braces.stringify]) {
    assert.doesNotThrow(() => call(allowed));
    guard(() => call(open.repeat(101) + 'x' + close.repeat(101)));
  }
}
`,
);

run(
  "caller-supplied deep ASTs reject across public and internal walkers",
  `
for (const kind of ['brace', 'paren']) {
  for (const method of ['compile', 'expand', 'stringify']) {
    guard(() => braces[method](makeAst(12000, kind)), RangeError);
    guard(() => requireBraces('./lib/' + method)(makeAst(12000, kind)), RangeError);
    guard(() => braces[method](makeAst(12000, kind), { maxDepth: Infinity }), RangeError);
  }
}
`,
);

run(
  "caller-supplied child cycles terminate with guard errors",
  `
for (const method of ['compile', 'expand', 'stringify']) {
  const ast = { type: 'root', nodes: [] };
  ast.nodes.push(ast);
  guard(() => braces[method](ast), RangeError);
}
`,
);

run(
  "expansion rejects cyclic and excessively long parent chains",
  `
for (const length of [1, 2]) {
  const root = { type: 'root', nodes: [] };
  const node = { type: 'paren', nodes: [{ type: 'text', value: 'x' }] };
  root.nodes.push(node);
  if (length === 1) node.parent = node;
  else { const second = { type: 'paren', nodes: [], parent: node }; node.parent = second; }
  guard(() => braces.expand(root), RangeError);
}
const root = { type: 'root', nodes: [] };
const node = { type: 'paren', nodes: [{ type: 'text', value: 'x' }] };
root.nodes.push(node);
let parent = node;
for (let i = 0; i < 1000; i++) {
  parent.parent = { type: 'paren', nodes: [] };
  parent = parent.parent;
}
guard(() => braces.expand(root), RangeError);
`,
);

run(
  "forged expansion queues reject deep and cyclic arrays",
  `
for (const cyclic of [false, true]) {
  let payload = 'x';
  if (cyclic) { payload = []; payload.push(payload); }
  else for (let i = 0; i < 12000; i++) payload = [payload];
  const root = { type: 'root', nodes: [] };
  root.nodes.push({ type: 'paren', nodes: [{ type: 'text', value: 'y' }],
    parent: { type: 'brace', queue: [payload] } });
  guard(() => braces.expand(root), RangeError);
  guard(() => requireBraces('./lib/utils').flatten(payload), RangeError);
}
`,
);

run(
  "malformed AST leaf values are rejected before string coercion",
  `
let value = 'x';
for (let depth = 0; depth < 12000; depth++) value = [value];
const cyclic = []; cyclic.push(cyclic);
for (const invalid of [value, cyclic, {}, 42]) {
  for (const method of ['compile', 'stringify']) {
    const ast = { type: 'root', nodes: [{ type: 'text', value: invalid }] };
    assert.throws(() => braces[method](ast), { name: 'TypeError', message: 'AST node value must be a string' });
  }
}
`,
);

run(
  "ordinary nested patterns, ranges and escaping keep expected output",
  `
assert.deepEqual(braces.expand('src/{app,{api,lib}}/*.{js,ts}'), [
  'src/app/*.js', 'src/app/*.ts', 'src/api/*.js', 'src/api/*.ts', 'src/lib/*.js', 'src/lib/*.ts',
]);
assert.deepEqual(braces.expand('v{01..03}'), ['v01', 'v02', 'v03']);
assert.deepEqual(braces.expand('{a..e..2}'), ['a', 'c', 'e']);
assert.deepEqual(braces.expand('{3..1}'), ['3', '2', '1']);
assert.deepEqual(braces.expand('a\\\\{b,c\\\\}'), ['a{b,c}']);
assert.deepEqual(braces.compile('src/{a,b}'), 'src/(a|b)');
assert.deepEqual(braces.stringify('{a,b}'), '{a,b}');
const literal = '{'.repeat(500) + 'x' + '}'.repeat(500);
assert.doesNotThrow(() => braces.parse('"' + literal + '"'));
assert.doesNotThrow(() => braces.parse('[' + literal + ']'));
assert.doesNotThrow(() => braces.parse('\\\\{'.repeat(500)));
`,
);

run(
  "micromatch resolves the protected package and keeps normal integrations",
  `
const micromatchEntry = ${JSON.stringify(micromatchEntry)};
const micromatch = require(micromatchEntry);
assert.equal(realpathSync(createRequire(micromatchEntry).resolve('braces')), realpathSync(${JSON.stringify(bracesEntry)}));
assert.deepEqual(micromatch(['src/a.js', 'src/b.ts', 'src/c.css'], 'src/*.{js,ts}'), ['src/a.js', 'src/b.ts']);
assert.deepEqual(micromatch.braceExpand('file{1..3}.{js,ts}'), ['file1.js', 'file1.ts', 'file2.js', 'file2.ts', 'file3.js', 'file3.ts']);
const bad = '{'.repeat(4000) + 'x' + '}'.repeat(4000);
guard(() => micromatch.braces(bad));
guard(() => micromatch.braceExpand(bad));
`,
);

if (baselineEntry) {
  run(
    "ordinary-expression corpus matches unmodified braces 3.0.3",
    `
  const original = require(${JSON.stringify(baselineEntry)});
  const fragments = ['', 'a', 'foo/bar', '{a,b}', '{a,{b,c}}', '{1..5}', '{01..04}', '{a..e}', '{5..1..2}', '\\\\{a,b\\\\}', '"{x,y}"', '[{a,b}]', '(a|b)', '{a}', '{}', '{a,b', 'a,b}', '{1..3,5}', '$' + '{a,b}'];
  let comparisons = 0;
  const outcome = fn => {
    try { return { ok: true, value: fn() }; }
    catch (error) { return { ok: false, name: error.name, message: error.message }; }
  };
  for (const left of fragments) for (const right of fragments) {
    const pattern = left + right;
    for (const method of ['compile', 'expand', 'stringify']) {
      assert.deepEqual(outcome(() => braces[method](pattern)), outcome(() => original[method](pattern)), method + ': ' + pattern);
      comparisons++;
    }
  }
  console.log(comparisons + ' unchanged comparisons');
  `,
  );
  run(
    "negative control confirms the original stack-exhaustion path",
    `
  const original = require(${JSON.stringify(baselineEntry)});
  const pattern = '{'.repeat(4000) + 'x' + '}'.repeat(4000);
  assert.throws(() => original.compile(pattern), /Maximum call stack size exceeded/);
  guard(() => braces.compile(pattern));
  `,
  );
}
console.log(`${passed} regression groups passed`);
