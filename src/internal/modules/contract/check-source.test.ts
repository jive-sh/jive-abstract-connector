import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { contractCheckSource } from "./check-source";

/**
 * Compiles the generated check against hand-written `ComponentApi` types, so what the check accepts is pinned
 * by tsc itself rather than by reading the type.
 */

const dir = mkdtempSync(join(tmpdir(), "jive-connector-contract-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
mkdirSync(join(dir, "node_modules/contract-abstract"), { recursive: true });
symlinkSync(resolve(import.meta.dir, "../../../../node_modules/typescript"), join(dir, "node_modules/typescript"));

const REF = (kind: string, args: string, returns: string) =>
  `{ _type: ${JSON.stringify(kind)}; _visibility: "internal"; _args: ${args}; _returnType: ${returns}; _componentPath: Name }`;

writeFileSync(join(dir, "node_modules/contract-abstract/package.json"), JSON.stringify({ name: "contract-abstract", types: "index.d.ts" }));
writeFileSync(join(dir, "node_modules/contract-abstract/index.d.ts"),
  `export type Contract<Name extends string | undefined = string | undefined> = { registry: { exists: ${REF("action", "{ name: string }", "boolean")} } };\n`);

function check(componentApi: string): { exitCode: number; output: string } {
  writeFileSync(join(dir, "component.ts"), `export type ComponentApi<Name extends string | undefined = string | undefined> = ${componentApi};\n`);
  writeFileSync(join(dir, "check.ts"), contractCheckSource({
    contract: { componentApiType: "Contract" },
    abstractPackageName: "contract-abstract",
    componentApiImport: "./component.js",
  }));
  const result = Bun.spawnSync(
    [resolve(dir, "node_modules/typescript/bin/tsc"), "--noEmit", "--strict", "--moduleResolution", "bundler", "--module", "esnext", "check.ts"],
    { cwd: dir, stdout: "pipe", stderr: "pipe" },
  );
  return { exitCode: result.exitCode, output: result.stdout.toString() };
}

describe("the contract check", () => {
  test("accepts exactly the contract's function, alongside others", () => {
    expect(check(`{ registry: { exists: ${REF("action", "{ name: string }", "boolean")}; extra: ${REF("query", "{}", "null")} } }`).exitCode).toBe(0);
  });

  test("names a missing module or function", () => {
    expect(check(`{ other: {} }`).output).toContain(`"the module registry is missing"`);
    expect(check(`{ registry: {} }`).output).toContain(`"registry.exists is missing"`);
  });

  test("refuses a different kind, an extra required argument, or a different return type", () => {
    for (const ref of [
      REF("query", "{ name: string }", "boolean"),
      REF("action", "{ name: string; scope: string }", "boolean"),
      REF("action", "{ name: string }", "string"),
    ]) {
      expect(check(`{ registry: { exists: ${ref} } }`).output).toContain(`"registry.exists does not have the contract's kind, arguments or return type"`);
    }
  });
});
