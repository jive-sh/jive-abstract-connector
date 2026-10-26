import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * The deploy:plan hook against a registry that already lists the fixture's version, so a push without a version
 * bump plans nothing. The registry is served from this process, so the hook is spawned asynchronously.
 */

const CLI = resolve(import.meta.dir, "../src/entrypoints/jive-connector.ts");
const fixture = JSON.parse(readFileSync(resolve(import.meta.dir, "fixture/package.json"), "utf8"));
const NAME: string = fixture.name;
const PUBLISHED: string = fixture.version;

const registry = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch: (request) => new URL(request.url).pathname === `/${NAME}`
    ? Response.json({
      name: NAME,
      "dist-tags": { latest: PUBLISHED },
      versions: { [PUBLISHED]: { name: NAME, version: PUBLISHED, dist: { tarball: `http://127.0.0.1/${NAME}.tgz` } } },
      time: { [PUBLISHED]: "2026-10-26T00:00:00.000Z" },
    })
    : new Response("{}", { status: 404 }),
});
const dir = mkdtempSync(join(tmpdir(), "jive-connector-deploy-plan-"));
afterAll(() => {
  registry.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

/** Runs deploy:plan for `latest` on the fixture's manifest at `version`, publishing to the fake registry. */
async function deployPlan(version: string) {
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    ...fixture,
    version,
    publishConfig: { registry: `http://127.0.0.1:${registry.port}/` },
    scripts: Object.fromEntries(Object.entries<string>(fixture.scripts)
      .map(([name, script]) => [name, script.replace("../../src/entrypoints/jive-connector.ts", CLI)])),
  }));
  const child = Bun.spawn(["bun", "run", "jive:cicd:deploy:plan"], {
    cwd: dir,
    env: {
      ...process.env,
      JIVE_DEPLOY_ENVIRONMENT: "latest",
      JIVE_PIPELINE_CONTEXT: JSON.stringify({
        provider: "Github",
        repository: { owner: "jive-sh", name: "jive-abstract-connector" },
        sourceBranch: "main",
        sourceCommitSha: "1a2b3c4d5e6f708192a3b4c5d6e7f80912345678",
        event: { type: "COMMIT" },
      }),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, exitCode };
}

test("plans nothing when the package's registry already lists this version", async () => {
  const { stdout, stderr, exitCode } = await deployPlan(PUBLISHED);
  expect({ exitCode, stdout }, stderr).toEqual({ exitCode: 0, stdout: '{"deploy":false}\n' });
}, 60_000);

test("plans a deploy to the version's npm page when the registry does not list it", async () => {
  const { stdout, stderr, exitCode } = await deployPlan("9.9.9");
  expect({ exitCode, stdout }, stderr).toEqual({
    exitCode: 0,
    stdout: `{"deploy":true,"url":"https://www.npmjs.com/package/${NAME}/v/9.9.9"}\n`,
  });
}, 60_000);
