import { Effect, FileSystem, pipe } from "effect";
import { implementing, type EffectGen } from "effective-modules";
import { basename, relative, resolve } from "node:path";
import { COMPONENT_GENERATED_DIR, CONTRACT_CHECK_FILE, CONTRACT_TSCONFIG_FILE, OUTDIR } from "../../common/constants";
import type { ConnectorContract } from "../../public/abstract";
import { connectorModules } from "../index";
import { contractCheckSource } from "./check-source";
import type { IContract } from "./interface";

export class ContractImpl extends implementing(connectorModules.Contract)
  .uses(FileSystem.FileSystem, connectorModules.TypeScript)
  implements IContract {
  *check(input: { readonly contract: ConnectorContract; readonly abstractPackageName: string }): EffectGen<void, string> {
    const fs = this.getDependency(FileSystem.FileSystem);
    const write = (path: string, text: string) => pipe(fs.writeFileString(path, text), Effect.mapError((e) => e.message));
    const componentApiImport = `./${relative(resolve(OUTDIR), resolve(COMPONENT_GENERATED_DIR, "component.js"))}`;

    yield* pipe(fs.makeDirectory(OUTDIR, { recursive: true }), Effect.mapError((e) => e.message));
    yield* write(CONTRACT_CHECK_FILE, contractCheckSource({ ...input, componentApiImport }));
    yield* write(CONTRACT_TSCONFIG_FILE, `${JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      files: [basename(CONTRACT_CHECK_FILE)],
    }, null, 2)}\n`);
    yield* Effect.log(`Checking the component against ${input.contract.componentApiType} from ${input.abstractPackageName}`);
    yield* this.dependencies.TypeScript.compile({
      project: CONTRACT_TSCONFIG_FILE,
      purpose: `confirm the component implements ${input.contract.componentApiType}`,
    });
  }
}
