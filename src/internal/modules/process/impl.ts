import { Effect, Stream, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { implementing, type EffectGen } from "effective-modules";
import { connectorModules } from "../index";
import type { IProcess, RunInput } from "./interface";

export class ProcessImpl extends implementing(connectorModules.Process)
  .uses(ChildProcessSpawner.ChildProcessSpawner)
  implements IProcess {
  *run(input: RunInput): EffectGen<void, string> {
    const spawner = this.getDependency(ChildProcessSpawner.ChildProcessSpawner);
    const command = ChildProcess.make(input.command, [...input.args], {
      cwd: input.cwd,
      extendEnv: true,
      env: { ...input.env },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "inherit",
    });
    const exitCode = yield* pipe(
      Effect.scoped(Effect.gen(function* () {
        const handle = yield* spawner.spawn(command);
        const [code] = yield* Effect.all([
          handle.exitCode,
          Stream.runForEach(handle.stdout, (chunk) => Effect.sync(() => { process.stderr.write(chunk); })),
        ], { concurrency: 2 });
        return code;
      })),
      Effect.mapError((e) => `Could not ${input.purpose}: ${e.message}`),
    );
    if (exitCode !== 0) {
      return yield* Effect.fail(`Could not ${input.purpose}: \`${[input.command, ...input.args].join(" ")}\` exited with code ${exitCode}`);
    }
  }
}
