import type { EffectGen } from "effective-modules";
import type { PackageJson } from "../../public/manifest";

/** `example/convex`: the app that installs the connector with `app.use`, as its usage example and its audit. */
export interface IExampleApp {
  /**
   * Packs the built package, installs the tarball into a throwaway copy of the example app under
   * `dist/audit-app`, and pushes that app to a local Convex backend. This is the check that the package as
   * published installs into an app: its entry points resolve, Convex bundles the component, the app's calls
   * typecheck against it, and the environment variables the app passes satisfy what the component declares.
   */
  pushWithBuiltPackage(packageJson: PackageJson): EffectGen<void, string>;
}
