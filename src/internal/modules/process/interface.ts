import type { EffectGen } from "effective-modules";

export interface RunInput {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  /** Directory the command runs in, relative to the working directory or absolute. */
  readonly cwd: string;
  /** Variables added to the inherited environment for this one command. */
  readonly env: Readonly<Record<string, string>>;
  /** What running it achieves, e.g. "regenerate the component's code"; failures are reported as "Could not <purpose>". */
  readonly purpose: string;
}

export interface IProcess {
  /**
   * Runs a command to completion, failing on a nonzero exit. Both its output streams go to this process's
   * stderr: two hooks' stdout is parsed by the pipeline, and a tool's progress must never land in it.
   */
  run(input: RunInput): EffectGen<void, string>;
}
