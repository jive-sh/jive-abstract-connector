import type { ConnectorAbstract, ScaffoldFiles, ScaffoldInput } from "./abstract";
import { CONVEX_VERSION_RANGE, EXAMPLE_APP_DIR, TYPESCRIPT_VERSION_RANGE } from "../common/constants";

/**
 * The files `<cli> create` writes. Each is a plain function of the scaffold input, so an abstract extending this
 * one composes them rather than restating them. Templates are strings in code, not files on disk: the CLI ships
 * as a compiled binary, which has no package directory to read templates from.
 */

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function lines(...text: ReadonlyArray<string>): string {
  return `${text.join("\n")}\n`;
}

const HOOKS = {
  "jive:cicd:get-config": "get-config",
  "jive:cicd:build": "build",
  "jive:cicd:audit": "audit",
  "jive:cicd:deploy:plan": "deploy-plan",
  "jive:cicd:upload-artifacts": "upload-artifacts",
  "jive:cicd:deploy": "deploy",
} as const;

function packageJson(abstract: ConnectorAbstract, input: ScaffoldInput): string {
  const { cliName } = abstract;
  return json({
    $schema: "./package.schema.json",
    name: input.packageName,
    version: "0.1.0",
    license: "MIT",
    type: "module",
    scripts: {
      ...Object.fromEntries(Object.entries(HOOKS).map(([script, hook]) => [script, `${cliName} cicd ${hook}`])),
      codegen: `${cliName} codegen`,
      dev: `${cliName} dev`,
    },
    peerDependencies: { convex: CONVEX_VERSION_RANGE },
    devDependencies: {
      convex: CONVEX_VERSION_RANGE,
      typescript: TYPESCRIPT_VERSION_RANGE,
    },
    jive: {
      cicd: {
        deploy: { verb: "Publish Tag", branches: { main: ["latest"] }, previews: false, sequentially: true },
        runsOnPullRequests: true,
        runsOn: "ubuntu-latest",
        requiredSecrets: ["NPM_TOKEN"],
      },
    },
  });
}

/** Typechecks the component as Convex bundles it; the build emits with its own settings on top of these. */
const TSCONFIG = json({
  compilerOptions: {
    target: "ESNext",
    lib: ["ES2023", "dom"],
    module: "ESNext",
    moduleResolution: "Bundler",
    strict: true,
    skipLibCheck: true,
    isolatedModules: true,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
  },
  include: ["src/**/*.ts"],
});

/** The settings `convex init` writes for an app's functions, so the example app typechecks the way Convex does. */
const EXAMPLE_APP_TSCONFIG = json({
  compilerOptions: {
    allowJs: true,
    strict: true,
    moduleResolution: "Bundler",
    jsx: "react-jsx",
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    target: "ESNext",
    lib: ["ES2023", "dom"],
    forceConsistentCasingInFileNames: true,
    module: "ESNext",
    isolatedModules: true,
    noEmit: true,
  },
  include: ["./**/*"],
  exclude: ["./_generated"],
});

const GITIGNORE = lines(
  "node_modules",
  "dist",
  ".DS_Store",
  "package.schema.json",
  "# The local Convex deployment `codegen` and `audit` run against",
  ".convex",
  ".env.local",
  `${EXAMPLE_APP_DIR}/_generated`,
);

const PIPELINE_YML = lines(
  "name: CI/CD Pipeline",
  "",
  "concurrency:",
  "  group: ${{ github.workflow }}-${{ github.ref }}",
  "  cancel-in-progress: true",
  "",
  "on:",
  "  pull_request:",
  "  push:",
  "  workflow_dispatch:",
  "",
  "# A reusable workflow can only reduce the caller's permissions; the deploy job needs id-token:write for npm",
  "# trusted publishing, so the caller grants it here.",
  "permissions:",
  "  contents: read",
  "  id-token: write",
  "",
  "jobs:",
  "  pipeline:",
  "    name: Pipeline",
  "    uses: jive-sh/jive/.github/workflows/reusable-pipeline.yml@main",
  "    secrets: inherit",
);

function readme(abstract: ConnectorAbstract, input: ScaffoldInput): string {
  return lines(
    `# ${input.packageName}`,
    "",
    `A Jive connector: a Convex component, \`${input.componentName}\`, published to npm. It extends`,
    `\`${abstract.abstractPackageName}\`, whose \`${abstract.cliName}\` CLI builds, audits and publishes it.`,
    "",
    "## Install it in a Convex app",
    "",
    "```ts",
    "// convex/convex.config.ts",
    `import ${input.componentName} from "${input.packageName}/convex.config.js";`,
    "",
    "const app = defineApp();",
    `app.use(${input.componentName}); // pass { env: { ... } } if the component declares environment variables`,
    "export default app;",
    "```",
    "",
    `The app then calls its functions through \`components.${input.componentName}\`. \`${EXAMPLE_APP_DIR}\` is a working example.`,
    "",
    "## Work on it",
    "",
    "- `src/component/` is the component. After changing its functions, run `bun run codegen`, which regenerates",
    "  `src/component/_generated` against a local Convex backend (no Convex account needed). Commit the result.",
    `- \`bun run jive:cicd:build\` emits the package into \`dist/package\`; \`bun run jive:cicd:audit\` checks the`,
    `  committed generated code is current and pushes \`${EXAMPLE_APP_DIR}\`, with the built package installed, to a local backend.`,
    "- A push to `main` publishes the version in package.json to npm, so bump it with every change meant for `main`.",
  );
}

/** `src/component/convex.config.ts`. `env` maps each declared variable to its validator, e.g. `{ API_TOKEN: "v.string()" }`. */
export function componentConfigSource(input: ScaffoldInput & { readonly env: Readonly<Record<string, string>> }): string {
  const variables = Object.entries(input.env);
  if (variables.length === 0) {
    return lines(
      `import { defineComponent } from "convex/server";`,
      "",
      "// Declare the environment variables this connector reads, e.g. defineComponent(name, { env: { API_TOKEN: v.string() } }).",
      "// The installing app supplies their values in app.use(component, { env }).",
      `export default defineComponent(${JSON.stringify(input.componentName)});`,
    );
  }
  return lines(
    `import { defineComponent } from "convex/server";`,
    `import { v } from "convex/values";`,
    "",
    `export default defineComponent(${JSON.stringify(input.componentName)}, {`,
    "  env: {",
    ...variables.map(([name, validator]) => `    ${name}: ${validator},`),
    "  },",
    "});",
  );
}

/**
 * `example/convex/convex.config.ts`: the app installing the component. `env` maps each declared variable to the
 * TypeScript expression supplying it, e.g. `{ API_TOKEN: "app.env.API_TOKEN" }` or a string literal.
 */
export function exampleAppConfigSource(input: ScaffoldInput & { readonly env: Readonly<Record<string, string>> }): string {
  const variables = Object.entries(input.env);
  const options = variables.length === 0
    ? ""
    : `, {\n  env: {\n${variables.map(([name, value]) => `    ${name}: ${value},`).join("\n")}\n  },\n}`;
  return lines(
    `import { defineApp } from "convex/server";`,
    `import ${input.componentName} from ${JSON.stringify(`${input.packageName}/convex.config.js`)};`,
    "",
    "const app = defineApp();",
    `app.use(${input.componentName}${options});`,
    "",
    "export default app;",
  );
}

/** Every file a connector package has, whatever its kind. */
export function commonScaffoldFiles(abstract: ConnectorAbstract, input: ScaffoldInput): ScaffoldFiles {
  return {
    "package.json": packageJson(abstract, input),
    "tsconfig.json": TSCONFIG,
    "convex.json": json({ functions: EXAMPLE_APP_DIR }),
    ".gitignore": GITIGNORE,
    ".github/workflows/pipeline.yml": PIPELINE_YML,
    "README.md": readme(abstract, input),
    "src/component/convex.config.ts": componentConfigSource({ ...input, env: {} }),
    "src/component/schema.ts": lines(
      `import { defineSchema } from "convex/server";`,
      "",
      "// The component's own tables; an installing app cannot read them except through the component's functions.",
      "export default defineSchema({});",
    ),
    [`${EXAMPLE_APP_DIR}/convex.config.ts`]: exampleAppConfigSource({ ...input, env: {} }),
    [`${EXAMPLE_APP_DIR}/tsconfig.json`]: EXAMPLE_APP_TSCONFIG,
  };
}

/** A plain connector's starting functions: one query, and an example-app action calling it. */
export function connectorScaffold(input: ScaffoldInput): ScaffoldFiles {
  return {
    "src/component/lib.ts": lines(
      `import { v } from "convex/values";`,
      `import { query } from "./_generated/server";`,
      "",
      "/** Answers without touching the outside system, so an installing app can check the component is installed. */",
      "export const ping = query({",
      "  args: {},",
      `  returns: v.literal("pong"),`,
      `  handler: async () => "pong" as const,`,
      "});",
    ),
    [`${EXAMPLE_APP_DIR}/example.ts`]: lines(
      `import { v } from "convex/values";`,
      `import { components } from "./_generated/api";`,
      `import { query } from "./_generated/server";`,
      "",
      "export const ping = query({",
      "  args: {},",
      `  returns: v.literal("pong"),`,
      `  handler: (ctx) => ctx.runQuery(components.${input.componentName}.lib.ping, {}),`,
      "});",
    ),
  };
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * The component name a package gets unless one is given: its name without a scope or the `jive-connector-`
 * prefix, in camelCase, e.g. `jive-connector-package-registry-npm` → `packageRegistryNpm`. Fails when that is
 * not a JavaScript identifier, since an app reaches the component as `components.<name>`.
 */
export function defaultComponentName(packageName: string): string | undefined {
  const words = packageName.replace(/^@[^/]+\//, "").replace(/^jive-connector-/, "").split(/[-_.]+/).filter((word) => word.length > 0);
  const name = words.map((word, index) => (index === 0 ? word : `${word[0]!.toUpperCase()}${word.slice(1)}`)).join("");
  return IDENTIFIER.test(name) ? name : undefined;
}

export function isComponentName(name: string): boolean {
  return IDENTIFIER.test(name);
}
