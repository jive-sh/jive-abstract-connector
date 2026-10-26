import type { EffectGen } from "effective-modules";
import type { PipelineContext } from "jive-abstract-library";
import type { PackageJson } from "../../public/manifest";

export interface ReleaseInput {
  readonly packageJson: PackageJson;
  /** The deploy target, e.g. "latest"; it selects the version and dist-tag. */
  readonly environment: string;
  readonly context: PipelineContext;
}

/** Publishing the built package (`dist/package`) to its npm registry, one version per environment. */
export interface IRelease {
  /** The npm page of the version this environment publishes; known before anything is published. */
  url(input: ReleaseInput): EffectGen<string, string>;
  /**
   * Stamps the environment's version and the repository the pipeline ran in onto the built manifest, then
   * publishes it under the environment's dist-tag. Fails before publishing if that version already exists.
   */
  publish(input: ReleaseInput): EffectGen<void, string>;
}
