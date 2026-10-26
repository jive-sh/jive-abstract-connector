import type { EffectGen } from "effective-modules";
import type { PackageJson } from "../../public/manifest";

/** The connector package's component: its source layout, its generated code, and the package built from it. */
export interface IComponentPackage {
  /**
   * Emits the component (and `src/client/index.ts`, if present) with declarations into `dist/package/dist`, copies
   * the source beside it, and writes the published manifest, whose `exports` name the entry points an installing
   * app imports (`<name>/convex.config.js`, `<name>/_generated/component.js`). The version is the local
   * environment's; deploy restamps it. Fails first if `convex.config.ts` or the generated code is missing.
   */
  build(packageJson: PackageJson): EffectGen<void, string>;
  /**
   * Regenerates `src/component/_generated` and fails, naming the files, if that changed anything: the generated
   * code is committed (Convex needs a backend to produce it), so a stale copy would ship types that lie.
   */
  checkGeneratedCodeCurrent(): EffectGen<void, string>;
}
