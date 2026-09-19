/** Run the production Node scripts with Node's native ESM/TypeScript loader, not a Jest transpilation substitute. */
import { execFileSync } from "node:child_process";
import path from "node:path";
it("passes the source-packaging and owner-archive security regressions", () => {
  const output = execFileSync(
    process.execPath,
    ["--test", "tests/node/showcase-scripts.test.mjs"],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      timeout: 15000,
    },
  );
  expect(output).toMatch(/(?:pass|✔)/);
}, 20000);
