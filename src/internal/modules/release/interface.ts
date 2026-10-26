import type { EffectGen } from "effective-modules";
import type { DeployPlan, PipelineContext } from "jive-abstract-library";
import type { PackageJson } from "../../public/manifest";

export interface ReleaseInput {
  readonly packageJson: PackageJson;
  /** The deploy target, e.g. "latest"; it selects the version and dist-tag. */
  readonly environment: string;
  readonly context: PipelineContext;
}

/** Publishing the built package (`dist/package`) to its npm registry, one version per environment. */
export interface IRelease {
  /**
   * Whether this environment has a version to publish: nothing when its registry already lists the version the
   * environment stamps, else a deploy to that version's npm page. Known before anything is published.
   */
  plan(input: ReleaseInput): EffectGen<DeployPlan, string>;
  /**
   * Stamps the environment's version and the repository the pipeline ran in onto the built manifest, then
   * publishes it under the environment's dist-tag. Fails before publishing if `plan` finds nothing to publish.
   */
  publish(input: ReleaseInput): EffectGen<void, string>;
}
