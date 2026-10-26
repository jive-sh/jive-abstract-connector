import type { EffectGen } from "effective-modules";
import type { ConnectorAbstract, ScaffoldInput } from "../../public/abstract";

export interface CreateInput {
  readonly abstract: ConnectorAbstract;
  /** Where the package is created; it must not exist yet, or be empty. */
  readonly directory: string;
  readonly scaffold: ScaffoldInput;
  /**
   * Add the abstract as a dev dependency, install, and generate the component's code, leaving a package that
   * builds as it stands. Without it, the package has no dependency on the abstract yet.
   */
  readonly install: boolean;
}

export interface IScaffold {
  /** Writes a new connector package of the abstract's kind; returns the paths written, relative to `directory`. */
  create(input: CreateInput): EffectGen<ReadonlyArray<string>, string>;
}
