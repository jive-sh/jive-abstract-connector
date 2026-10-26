import { Command } from "commander";
import { Effect } from "effect";
import { basename, resolve } from "node:path";
import { makeCicdCommand } from "../common/command";
import { connectorModules } from "../modules";
import type { ConnectorAbstract } from "../public/abstract";
import { defaultComponentName, isComponentName } from "../public/scaffold";

interface CreateOptions {
  readonly name?: string;
  readonly component?: string;
  readonly install: boolean;
}

/** `<cli> create <directory>`: scaffolds a new connector package of this abstract's kind. */
export function createCommand(abstract: ConnectorAbstract): Command {
  const create: Command = makeCicdCommand(
    "create",
    `create a new ${abstract.abstractPackageName.replace(/^jive-abstract-/, "").replaceAll("-", " ")} package`,
    function* () {
      const directory = resolve(create.args[0]!);
      const options = create.opts<CreateOptions>();
      const packageName = options.name ?? basename(directory);
      const componentName = options.component ?? defaultComponentName(packageName);
      if (componentName === undefined || !isComponentName(componentName)) {
        return yield* Effect.fail(
          `"${componentName ?? packageName}" cannot name a Convex component, which an app reaches as components.<name>; `
          + `pass --component <identifier>`,
        );
      }
      const written = yield* (yield* connectorModules.Scaffold).create({
        abstract,
        directory,
        scaffold: { packageName, componentName },
        install: options.install,
      });
      yield* Effect.log(`Wrote ${written.length} files:\n  ${written.join("\n  ")}`);
    },
  );
  return create
    .argument("<directory>", "where to create the package; it must not exist yet, or be empty")
    .option("--name <package>", "the package's npm name (default: the directory's name)")
    .option("--component <name>", "the component's name, a JavaScript identifier (default: derived from the package name)")
    .option("--no-install", "only write the files: skip adding the abstract, installing, and generating the component's code");
}
