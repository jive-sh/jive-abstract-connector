import type { EffectGen } from "effective-modules";

/**
 * The `convex` CLI, run with the version installed in the directory it acts on. Every command first configures
 * that directory with an anonymous deployment on a local backend (`convex init`, which is idempotent), so no
 * Convex account or credential is involved.
 */
export interface IConvexCli {
  /** Regenerates `src/component/_generated` in the package at `packageDir`; Convex needs a backend to do this. */
  codegenComponent(packageDir: string): EffectGen<void, string>;
  /**
   * Pushes the Convex app at `appDir` (its `convex/` functions and every component it installs) to a local
   * backend: bundling, typechecking and checking each installed component's environment variables, as a real
   * deploy would.
   */
  pushApp(appDir: string): EffectGen<void, string>;
}
