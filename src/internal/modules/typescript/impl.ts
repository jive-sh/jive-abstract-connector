import { implementing, type EffectGen } from "effective-modules";
import { connectorModules } from "../index";
import type { ITypeScript } from "./interface";

export class TypeScriptImpl extends implementing(connectorModules.TypeScript)
  .uses(connectorModules.Process)
  implements ITypeScript {
  *compile(input: { readonly project: string; readonly purpose: string }): EffectGen<void, string> {
    yield* this.dependencies.Process.run({
      command: "bunx",
      args: ["tsc", "--pretty", "-p", input.project],
      cwd: ".",
      env: {},
      purpose: input.purpose,
    });
  }
}
