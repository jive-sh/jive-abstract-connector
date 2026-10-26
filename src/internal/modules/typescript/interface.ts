import type { EffectGen } from "effective-modules";

export interface ITypeScript {
  /**
   * Runs the package's own `tsc` on one project file. Whether it emits is that project's setting; diagnostics
   * go to stderr and any error fails with `purpose`.
   */
  compile(input: { readonly project: string; readonly purpose: string }): EffectGen<void, string>;
}
