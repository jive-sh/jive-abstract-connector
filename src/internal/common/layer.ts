import { Layer, pipe } from "effect";
import { BunChildProcessSpawner, BunFileSystem, BunPath } from "@effect/platform-bun";
import { ComponentPackageImpl } from "../modules/component-package/impl";
import { ContractImpl } from "../modules/contract/impl";
import { ConvexCliImpl } from "../modules/convex-cli/impl";
import { ExampleAppImpl } from "../modules/example-app/impl";
import { PackageImpl } from "../modules/package/impl";
import { ProcessImpl } from "../modules/process/impl";
import { ReleaseImpl } from "../modules/release/impl";
import { ScaffoldImpl } from "../modules/scaffold/impl";
import { TypeScriptImpl } from "../modules/typescript/impl";

/** Every module this abstract owns, most-dependent first. */
export const layerLive = pipe(
  ScaffoldImpl.Layer,
  Layer.provideMerge(ReleaseImpl.Layer),
  Layer.provideMerge(ExampleAppImpl.Layer),
  Layer.provideMerge(ContractImpl.Layer),
  Layer.provideMerge(ComponentPackageImpl.Layer),
  Layer.provideMerge(ConvexCliImpl.Layer),
  Layer.provideMerge(TypeScriptImpl.Layer),
  Layer.provideMerge(ProcessImpl.Layer),
  Layer.provideMerge(PackageImpl.Layer),
  Layer.provideMerge(BunChildProcessSpawner.layer),
  Layer.provideMerge(BunFileSystem.layer),
  Layer.provideMerge(BunPath.layer),
) satisfies Layer.Layer<any, any, never>;
