/** Where a connector's Convex component lives in its package, as Convex's own component template lays it out. */
export const COMPONENT_DIR = "src/component";
export const COMPONENT_CONFIG_FILE = `${COMPONENT_DIR}/convex.config.ts`;
/** Written by `convex codegen --component-dir`, which needs a running backend, so it is committed like any source. */
export const COMPONENT_GENERATED_DIR = `${COMPONENT_DIR}/_generated`;
/** Optional typed wrapper an installing app imports as the package's main entry. */
export const CLIENT_ENTRYPOINT = "src/client/index.ts";
/** The Convex app that installs the component with `app.use`: its usage example and what audit pushes. */
export const EXAMPLE_APP_DIR = "example/convex";

export const OUTDIR = "dist";
/** The package exactly as it is published: emitted JS and declarations under dist/, the source under src/. */
export const PACKAGE_OUTDIR = `${OUTDIR}/package`;
/** The throwaway Convex app audit installs the packed package into. */
export const AUDIT_APP_DIR = `${OUTDIR}/audit-app`;
export const BUILD_TSCONFIG_FILE = `${OUTDIR}/tsconfig.build.json`;
export const CONTRACT_CHECK_FILE = `${OUTDIR}/contract-check.ts`;
export const CONTRACT_TSCONFIG_FILE = `${OUTDIR}/tsconfig.contract.json`;

/**
 * Makes `convex init` configure an anonymous deployment on a local backend the CLI downloads and runs itself,
 * with no Convex account. Every command this abstract runs against a backend uses one, so neither a developer
 * nor CI needs Convex credentials to audit or regenerate a connector.
 */
export const LOCAL_DEPLOYMENT_ENV = { CONVEX_AGENT_MODE: "anonymous" } as const;

/** The Convex release scaffolded packages start on; 1.39.0 added component environment variables. */
export const CONVEX_VERSION_RANGE = "^1.48.0";
export const TYPESCRIPT_VERSION_RANGE = "^5.9.3";

export const NPM_REGISTRY_URL = "https://registry.npmjs.org";
export const NPM_WEBSITE_URL = "https://www.npmjs.com";
