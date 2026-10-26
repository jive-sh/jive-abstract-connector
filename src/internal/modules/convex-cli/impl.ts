import { implementing, type EffectGen } from "effective-modules";
import { COMPONENT_DIR, LOCAL_DEPLOYMENT_ENV } from "../../common/constants";
import { connectorModules } from "../index";
import type { IConvexCli } from "./interface";

export class ConvexCliImpl extends implementing(connectorModules.ConvexCli)
  .uses(connectorModules.Process)
  implements IConvexCli {
  *codegenComponent(packageDir: string): EffectGen<void, string> {
    yield* this.convex(packageDir, ["init"], "configure a local Convex deployment");
    yield* this.convex(packageDir, ["codegen", "--component-dir", `./${COMPONENT_DIR}`], "regenerate the component's code");
  }

  *pushApp(appDir: string): EffectGen<void, string> {
    yield* this.convex(appDir, ["init"], "configure a local Convex deployment");
    yield* this.convex(appDir, ["dev", "--once"], "push the app to a local Convex backend");
  }

  private *convex(cwd: string, args: ReadonlyArray<string>, purpose: string): EffectGen<void, string> {
    yield* this.dependencies.Process.run({ command: "bunx", args: ["convex", ...args], cwd, env: LOCAL_DEPLOYMENT_ENV, purpose });
  }
}
