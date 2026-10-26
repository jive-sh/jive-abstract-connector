import { Effect, FileSystem, Option, pipe } from "effect";
import { implementing, type EffectGen } from "effective-modules";
import { resolve } from "node:path";
import { AUDIT_APP_DIR, EXAMPLE_APP_DIR, OUTDIR, PACKAGE_OUTDIR } from "../../common/constants";
import type { PackageJson } from "../../public/manifest";
import { connectorModules } from "../index";
import type { IExampleApp } from "./interface";

const TARBALL = "audit-package.tgz";

export class ExampleAppImpl extends implementing(connectorModules.ExampleApp)
  .uses(FileSystem.FileSystem, connectorModules.Process, connectorModules.ConvexCli)
  implements IExampleApp {
  *pushWithBuiltPackage(packageJson: PackageJson): EffectGen<void, string> {
    const fs = this.getDependency(FileSystem.FileSystem);
    const fsOp = <A>(operation: Effect.Effect<A, { readonly message: string }>) => pipe(operation, Effect.mapError((e) => e.message));

    if (!(yield* fsOp(fs.exists(`${PACKAGE_OUTDIR}/package.json`)))) {
      return yield* Effect.fail(`${PACKAGE_OUTDIR} has no built package: run the jive:cicd:build hook first`);
    }
    if (!(yield* fsOp(fs.exists(`${EXAMPLE_APP_DIR}/convex.config.ts`)))) {
      return yield* Effect.fail(`${EXAMPLE_APP_DIR}/convex.config.ts is missing: it is the app that installs this connector with app.use`);
    }

    yield* this.dependencies.Process.run({
      command: "bun",
      args: ["pm", "pack", "--quiet", "--filename", resolve(OUTDIR, TARBALL)],
      cwd: PACKAGE_OUTDIR,
      env: {},
      purpose: "pack the built package",
    });

    yield* fsOp(fs.remove(AUDIT_APP_DIR, { recursive: true, force: true }));
    yield* fsOp(fs.makeDirectory(AUDIT_APP_DIR, { recursive: true }));
    yield* fsOp(fs.copy(EXAMPLE_APP_DIR, `${AUDIT_APP_DIR}/convex`));
    yield* fsOp(fs.remove(`${AUDIT_APP_DIR}/convex/_generated`, { recursive: true, force: true }));

    const devDependency = (name: string) =>
      Option.flatMap(packageJson.devDependencies, (record) => Option.fromNullishOr(record[name]));
    const typescript = devDependency("typescript");
    yield* fsOp(fs.writeFileString(`${AUDIT_APP_DIR}/package.json`, `${JSON.stringify({
      name: "audit-app",
      private: true,
      type: "module",
      dependencies: {
        convex: Option.getOrElse(devDependency("convex"), () => "*"),
        [packageJson.name]: `file:../${TARBALL}`,
      },
      ...Option.match(typescript, { onNone: () => ({}), onSome: (range) => ({ devDependencies: { typescript: range } }) }),
    }, null, 2)}\n`));

    yield* Effect.log(`Installing the built ${packageJson.name} into ${AUDIT_APP_DIR}, a copy of ${EXAMPLE_APP_DIR}`);
    yield* this.dependencies.Process.run({
      command: "bun",
      args: ["install"],
      cwd: AUDIT_APP_DIR,
      env: {},
      purpose: "install the built package into the audit app",
    });
    yield* this.dependencies.ConvexCli.pushApp(AUDIT_APP_DIR);
    yield* Effect.log(`The built ${packageJson.name} installs into ${EXAMPLE_APP_DIR} and pushes to a Convex backend`);
  }
}
