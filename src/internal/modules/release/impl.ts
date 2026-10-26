import { Effect, FileSystem, Option, pipe } from "effect";
import { HttpClient } from "effect/http";
import { implementing, type EffectGen } from "effective-modules";
import { resolve } from "node:path";
import { ensureNpm, publishPackage, releaseDistTag, releaseVersion, type PipelineContext } from "jive-abstract-library";
import { NPM_REGISTRY_URL, NPM_WEBSITE_URL, OUTDIR, PACKAGE_OUTDIR } from "../../common/constants";
import type { PackageJson } from "../../public/manifest";
import { connectorModules } from "../index";
import type { IRelease, ReleaseInput } from "./interface";

const PROVIDER_HOSTS = { Github: "github.com", Gitlab: "gitlab.com" } as const satisfies Record<PipelineContext["provider"], string>;

function registryOf(packageJson: PackageJson): string {
  const configured = Option.flatMap(packageJson.publishConfig, (config) => Option.fromNullishOr(config["registry"]));
  return Option.match(configured, {
    onNone: () => NPM_REGISTRY_URL,
    onSome: (registry) => String(registry).replace(/\/+$/, ""),
  });
}

export class ReleaseImpl extends implementing(connectorModules.Release)
  .uses(FileSystem.FileSystem, HttpClient.HttpClient)
  implements IRelease {
  *url({ packageJson, environment, context }: ReleaseInput): EffectGen<string, string> {
    const version = releaseVersion(packageJson.version, environment, context.sourceCommitSha);
    return `${NPM_WEBSITE_URL}/package/${packageJson.name}/v/${version}`;
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
    yield* this.checkUnpublished(packageJson, version);

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

    yield* Effect.log(`Publishing ${packageJson.name}@${version} under "${distTag}" to ${registryOf(packageJson)}`);
    yield* ensureNpm();
    yield* publishPackage({ packageDir: resolve(PACKAGE_OUTDIR), outDir: resolve(OUTDIR), version, distTag });
  }

  private *checkUnpublished(packageJson: PackageJson, version: string): EffectGen<void, string> {
    const registry = registryOf(packageJson);
    const url = `${registry}/${packageJson.name.replace("/", "%2f")}/${encodeURIComponent(version)}`;
    const response = yield* pipe(
      this.getDependency(HttpClient.HttpClient).get(url),
      Effect.mapError((e) => `Could not ask ${registry} whether ${packageJson.name}@${version} exists: ${e.message}`),
    );
    if (response.status === 404) return;
    if (response.status === 200) {
      return yield* Effect.fail(`${packageJson.name}@${version} is already published. Bump "version" in package.json.`);
    }
    return yield* Effect.fail(`Could not ask ${registry} whether ${packageJson.name}@${version} exists: it answered ${response.status}`);
  }
}
