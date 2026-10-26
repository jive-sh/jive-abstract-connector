import { Effect, FileSystem, Option, pipe } from "effect";
import { implementing, type EffectGen } from "effective-modules";
import { resolve } from "node:path";
import { ensureNpm, planNpmRelease, publishPackage, releaseDistTag, releaseVersion, type DeployPlan, type PipelineContext } from "jive-abstract-library";
import { OUTDIR, PACKAGE_OUTDIR } from "../../common/constants";
import type { PackageJson } from "../../public/manifest";
import { connectorModules } from "../index";
import type { IRelease, ReleaseInput } from "./interface";

const PROVIDER_HOSTS = { Github: "github.com", Gitlab: "gitlab.com" } as const satisfies Record<PipelineContext["provider"], string>;

/** The registry the package publishes to, when its manifest names one rather than using npm's configured registry. */
function registryOf(packageJson: PackageJson): Option.Option<string> {
  return pipe(
    Option.flatMap(packageJson.publishConfig, (config) => Option.fromNullishOr(config["registry"])),
    Option.map((registry) => String(registry)),
  );
}

export class ReleaseImpl extends implementing(connectorModules.Release)
  .uses(FileSystem.FileSystem)
  implements IRelease {
  *plan({ packageJson, environment, context }: ReleaseInput): EffectGen<DeployPlan, string> {
    return yield* planNpmRelease({
      name: packageJson.name,
      version: releaseVersion(packageJson.version, environment, context.sourceCommitSha),
      registry: registryOf(packageJson),
    });
  }

  *publish({ packageJson, environment, context }: ReleaseInput): EffectGen<void, string> {
    const fs = this.getDependency(FileSystem.FileSystem);
    const manifestPath = `${PACKAGE_OUTDIR}/package.json`;
    const version = releaseVersion(packageJson.version, environment, context.sourceCommitSha);
    const distTag = releaseDistTag(environment, context.sourceCommitSha);

    const text = yield* pipe(
      fs.readFileString(manifestPath),
      Effect.mapError(() => `${manifestPath} is missing: the build hook writes it, and the deploy job receives it with the build's artifact`),
    );
    if (!(yield* this.plan({ packageJson, environment, context })).deploy) {
      return yield* Effect.fail(`${packageJson.name}@${version} is already published. Bump "version" in package.json.`);
    }

    const manifest = yield* Effect.try({
      try: () => JSON.parse(text) as Record<string, unknown>,
      catch: (e) => `${manifestPath} is not valid JSON: ${(e as Error).message}`,
    });
    // npm's provenance check for trusted publishing compares this with the repository that ran the workflow.
    const repository = {
      type: "git",
      url: `git+https://${PROVIDER_HOSTS[context.provider]}/${context.repository.owner}/${context.repository.name}.git`,
    };
    yield* pipe(
      fs.writeFileString(manifestPath, `${JSON.stringify({ ...manifest, repository }, null, 2)}\n`),
      Effect.mapError((e) => `Cannot write ${manifestPath}: ${e.message}`),
    );

    yield* Effect.log(`Publishing ${packageJson.name}@${version} under "${distTag}" to ${Option.getOrElse(registryOf(packageJson), () => "npm's registry")}`);
    yield* ensureNpm();
    yield* publishPackage({ packageDir: resolve(PACKAGE_OUTDIR), outDir: resolve(OUTDIR), version, distTag });
  }
}
