import { Effect, FileSystem, Option, pipe } from "effect";
import { implementing, type EffectGen } from "effective-modules";
import { relative, resolve } from "node:path";
import { LOCAL_ENVIRONMENT, releaseVersion } from "jive-abstract-library";
import {
  BUILD_TSCONFIG_FILE,
  CLIENT_ENTRYPOINT,
  COMPONENT_CONFIG_FILE,
  COMPONENT_GENERATED_DIR,
  OUTDIR,
  PACKAGE_OUTDIR,
} from "../../common/constants";
import type { PackageJson } from "../../public/manifest";
import { connectorModules } from "../index";
import type { IComponentPackage } from "./interface";

/** Files copied into the published package when the source package has them. */
const ROOT_FILES = ["README.md", "LICENSE"] as const;

function emitTsconfig(): string {
  // Paths in a tsconfig are relative to the file itself, which lives in dist/.
  const fromOutdir = (path: string) => relative(resolve(OUTDIR), resolve(path));
  return `${JSON.stringify({
    compilerOptions: {
      target: "ESNext",
      lib: ["ES2023", "dom"],
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      skipLibCheck: true,
      isolatedModules: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      noEmit: false,
      rootDir: fromOutdir("src"),
      outDir: fromOutdir(`${PACKAGE_OUTDIR}/dist`),
    },
    include: [`${fromOutdir("src")}/**/*.ts`],
    exclude: [`${fromOutdir("src")}/**/*.test.ts`],
  }, null, 2)}\n`;
}

function entry(path: string) {
  return { types: `./dist/${path}.d.ts`, default: `./dist/${path}.js` };
}

export class ComponentPackageImpl extends implementing(connectorModules.ComponentPackage)
  .uses(FileSystem.FileSystem, connectorModules.TypeScript, connectorModules.ConvexCli)
  implements IComponentPackage {
  *build(packageJson: PackageJson): EffectGen<void, string> {
    const fs = this.getDependency(FileSystem.FileSystem);
    if (!(yield* this.exists(COMPONENT_CONFIG_FILE))) {
      return yield* Effect.fail(`${COMPONENT_CONFIG_FILE} is missing: a connector is a Convex component, defined there with defineComponent`);
    }
    if (!(yield* this.exists(`${COMPONENT_GENERATED_DIR}/component.ts`))) {
      return yield* Effect.fail(`${COMPONENT_GENERATED_DIR} is missing: run the package's "codegen" script and commit what it writes`);
    }
    const hasClient = yield* this.exists(CLIENT_ENTRYPOINT);

    yield* this.fsOp(fs.remove(PACKAGE_OUTDIR, { recursive: true, force: true }));
    yield* this.fsOp(fs.makeDirectory(PACKAGE_OUTDIR, { recursive: true }));
    yield* this.fsOp(fs.writeFileString(BUILD_TSCONFIG_FILE, emitTsconfig()));
    yield* Effect.log(`Emitting ${packageJson.name} into ${PACKAGE_OUTDIR}`);
    yield* this.dependencies.TypeScript.compile({ project: BUILD_TSCONFIG_FILE, purpose: "typecheck and emit the component" });

    yield* this.fsOp(fs.copy("src", `${PACKAGE_OUTDIR}/src`));
    const rootFiles: Array<string> = [];
    for (const file of ROOT_FILES) {
      if (yield* this.exists(file)) {
        yield* this.fsOp(fs.copyFile(file, `${PACKAGE_OUTDIR}/${file}`));
        rootFiles.push(file);
      }
    }

    const version = releaseVersion(packageJson.version, LOCAL_ENVIRONMENT, "");
    const optional = <A>(field: string, value: Option.Option<A>) =>
      Option.match(value, { onNone: () => ({}), onSome: (present) => ({ [field]: present }) });
    const manifest = {
      name: packageJson.name,
      version,
      license: packageJson.license,
      ...optional("description", packageJson.description),
      type: "module",
      files: ["dist", "src", ...rootFiles],
      ...(hasClient ? { main: "./dist/client/index.js", types: "./dist/client/index.d.ts" } : {}),
      exports: {
        "./package.json": "./package.json",
        ...(hasClient ? { ".": entry("client/index") } : {}),
        "./convex.config.js": entry("component/convex.config"),
        "./convex.config": entry("component/convex.config"),
        // Types only: an app references a component's functions through `components.<name>`, never by importing them.
        "./_generated/component.js": { types: "./dist/component/_generated/component.d.ts" },
        "./_generated/component": { types: "./dist/component/_generated/component.d.ts" },
      },
      ...optional("dependencies", packageJson.dependencies),
      ...optional("peerDependencies", packageJson.peerDependencies),
      ...optional("peerDependenciesMeta", packageJson.peerDependenciesMeta),
      ...optional("publishConfig", packageJson.publishConfig),
    };
    yield* this.fsOp(fs.writeFileString(`${PACKAGE_OUTDIR}/package.json`, `${JSON.stringify(manifest, null, 2)}\n`));
    yield* Effect.log(`Built ${packageJson.name}@${version}${hasClient ? " with its client" : ""}`);
  }

  *checkGeneratedCodeCurrent(): EffectGen<void, string> {
    const before = yield* this.readGenerated();
    yield* this.dependencies.ConvexCli.codegenComponent(".");
    const after = yield* this.readGenerated();
    const changed = [...new Set([...before.keys(), ...after.keys()])]
      .filter((file) => before.get(file) !== after.get(file))
      .sort();
    if (changed.length > 0) {
      return yield* Effect.fail(
        `The committed ${COMPONENT_GENERATED_DIR} did not match the component; regenerating changed `
        + `${changed.join(", ")}. Commit the regenerated files.`,
      );
    }
    yield* Effect.log(`${COMPONENT_GENERATED_DIR} matches the component`);
  }

  private *readGenerated(): EffectGen<Map<string, string>, string> {
    const fs = this.getDependency(FileSystem.FileSystem);
    const contents = new Map<string, string>();
    if (!(yield* this.exists(COMPONENT_GENERATED_DIR))) return contents;
    for (const file of yield* this.fsOp(fs.readDirectory(COMPONENT_GENERATED_DIR))) {
      contents.set(file, yield* this.fsOp(fs.readFileString(`${COMPONENT_GENERATED_DIR}/${file}`)));
    }
    return contents;
  }

  private *exists(path: string): EffectGen<boolean, string> {
    return yield* this.fsOp(this.getDependency(FileSystem.FileSystem).exists(path));
  }

  private *fsOp<A>(operation: Effect.Effect<A, { readonly message: string }>): EffectGen<A, string> {
    return yield* pipe(operation, Effect.mapError((e) => e.message));
  }
}
