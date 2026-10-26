import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Runs the hooks against test/fixture, a connector made by `jive-connector create`, the way Jive's pipeline
 * does. Every backend involved is an anonymous local one the `convex` CLI downloads and runs, so nothing here
 * needs a Convex account. Deploy is not run: this repository is a library, and the hook would publish to npm.
 */

const REPO_DIR = resolve(import.meta.dir, "..");
const CLI = resolve(REPO_DIR, "src/entrypoints/jive-connector.ts");
const FIXTURE_DIR = resolve(import.meta.dir, "fixture");
const TIMEOUT = 5 * 60 * 1000;
const scratchDirs: Array<string> = [];

const pullRequest = JSON.stringify({
  provider: "Github",
  repository: { owner: "jive-sh", name: "jive-abstract-connector" },
  sourceBranch: "feature",
  sourceCommitSha: "1a2b3c4d5e6f708192a3b4c5d6e7f80912345678",
  event: { type: "PULL_REQUEST", id: "7", destinationBranch: "main" },
});

function run(command: ReadonlyArray<string>, cwd: string, env: Record<string, string | undefined> = {}) {
  const result = Bun.spawnSync([...command], { cwd, env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

function hook(script: string, cwd = FIXTURE_DIR, env: Record<string, string | undefined> = {}) {
  return run(["bun", "run", script], cwd, env);
}

/** A copy of the fixture to break on purpose, with its own dependencies and nothing built. */
function fixtureCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "jive-connector-fixture-"));
  scratchDirs.push(dir);
  cpSync(FIXTURE_DIR, dir, {
    recursive: true,
    filter: (source) => !/[/\\](node_modules|dist|\.convex)$/.test(source) && !source.endsWith(".env.local"),
  });
  const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const [name, script] of Object.entries<string>(packageJson.scripts)) {
    packageJson.scripts[name] = script.replace("../../src/entrypoints/jive-connector.ts", CLI);
  }
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  expect(run(["bun", "install"], dir).exitCode).toBe(0);
  return dir;
}

afterAll(() => {
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

describe("the hooks, run against test/fixture", () => {
  test("get-config prints only the validated jive block on stdout", () => {
    const { exitCode, stdout, stderr } = hook("jive:cicd:get-config");
    expect(exitCode, stderr).toBe(0);
    expect(Object.keys(JSON.parse(stdout))).toEqual(["cicd"]);
  });

  test("build emits the component with the entry points an installing app imports", () => {
    const build = hook("jive:cicd:build");
    expect(build.exitCode, build.stderr).toBe(0);
    const manifest = JSON.parse(readFileSync(join(FIXTURE_DIR, "dist/package/package.json"), "utf8"));
    expect(manifest.version).toBe("0.1.0-local");
    expect(Object.keys(manifest.exports).sort()).toEqual([
      "./_generated/component", "./_generated/component.js", "./convex.config", "./convex.config.js", "./package.json",
    ]);
    for (const path of ["dist/component/convex.config.js", "dist/component/_generated/component.d.ts", "src/component/lib.ts"]) {
      expect(existsSync(join(FIXTURE_DIR, "dist/package", path)), path).toBe(true);
    }
  }, TIMEOUT);

  test("audit installs the built package into the example app, and the app's env reaches the component", () => {
    const audit = hook("jive:cicd:audit");
    expect(audit.exitCode, audit.stderr).toBe(0);
    expect(audit.stderr).toContain("Installed component fixture.");
    const greeting = run(["bunx", "convex", "run", "example:greet", JSON.stringify({ name: "Ada" })], join(FIXTURE_DIR, "dist/audit-app"));
    expect(greeting.exitCode, greeting.stderr).toBe(0);
    expect(JSON.parse(greeting.stdout)).toBe("Hello, Ada");
  }, TIMEOUT);

  test("deploy:url prints the npm page of the version each environment publishes", () => {
    const url = (environment: string) =>
      hook("jive:cicd:deploy:url", FIXTURE_DIR, { JIVE_DEPLOY_ENVIRONMENT: environment, JIVE_PIPELINE_CONTEXT: pullRequest }).stdout;
    expect(url("latest")).toBe("https://www.npmjs.com/package/jive-abstract-connector-fixture/v/0.1.0\n");
    expect(url("Preview")).toBe("https://www.npmjs.com/package/jive-abstract-connector-fixture/v/0.1.0-preview-1a2b3c4d\n");
  });
});

describe("audit refuses a connector that would ship broken", () => {
  test("when the committed generated code no longer matches the component", () => {
    const dir = fixtureCopy();
    const lib = join(dir, "src/component/lib.ts");
    writeFileSync(lib, `${readFileSync(lib, "utf8")}\nexport const added = query({ args: {}, returns: v.null(), handler: async () => null });\n`);
    expect(hook("jive:cicd:build", dir).exitCode).toBe(0);
    const audit = hook("jive:cicd:audit", dir);
    expect(audit.exitCode).not.toBe(0);
    expect(audit.stderr).toContain("did not match the component; regenerating changed component.ts");
  }, TIMEOUT);

  test("when the example app does not supply an environment variable the component requires", () => {
    const dir = fixtureCopy();
    writeFileSync(join(dir, "example/convex/convex.config.ts"), [
      `import { defineApp } from "convex/server";`,
      `import fixture from "jive-abstract-connector-fixture/convex.config.js";`,
      `const app = defineApp();`,
      `// @ts-expect-error: GREETING is required, which is the point of this test`,
      `app.use(fixture);`,
      `export default app;`,
      ``,
    ].join("\n"));
    expect(hook("jive:cicd:build", dir).exitCode).toBe(0);
    const audit = hook("jive:cicd:audit", dir);
    expect(audit.exitCode).not.toBe(0);
    expect(audit.stderr).toContain("Could not push the app to a local Convex backend");
  }, TIMEOUT);
});

describe("create", () => {
  test("scaffolds a connector that builds and passes audit as it stands", () => {
    const parent = mkdtempSync(join(tmpdir(), "jive-connector-create-"));
    scratchDirs.push(parent);
    const dir = join(parent, "jive-connector-example-system");
    // --no-install, because the scaffold's install step adds jive-abstract-connector from npm, and this test
    // runs the CLI from source instead.
    const create = run(["bun", CLI, "create", dir, "--no-install"], parent);
    expect(create.exitCode, create.stderr).toBe(0);
    expect(create.stderr).toContain("component exampleSystem");

    const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    expect(packageJson.scripts["jive:cicd:build"]).toBe("jive-connector cicd build");
    for (const [name, script] of Object.entries<string>(packageJson.scripts)) {
      packageJson.scripts[name] = script.replace("jive-connector ", `bun ${CLI} `);
    }
    writeFileSync(join(dir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);

    expect(run(["bun", "install"], dir).exitCode).toBe(0);
    for (const script of ["codegen", "jive:cicd:get-config", "jive:cicd:build", "jive:cicd:audit"]) {
      const result = hook(script, dir);
      expect(result.exitCode, `${script}: ${result.stderr}`).toBe(0);
    }
    const ping = run(["bunx", "convex", "run", "example:ping"], join(dir, "dist/audit-app"));
    expect(JSON.parse(ping.stdout)).toBe("pong");
  }, TIMEOUT);

  test("refuses a directory that already has files", () => {
    const create = run(["bun", CLI, "create", FIXTURE_DIR, "--no-install"], REPO_DIR);
    expect(create.exitCode).not.toBe(0);
    expect(create.stderr).toContain("already exists and is not empty");
  });
});
