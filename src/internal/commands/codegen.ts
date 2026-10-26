import { makeCicdCommand } from "../common/command";
import { connectorModules } from "../modules";
import { COMPONENT_GENERATED_DIR } from "../common/constants";

/** Not a hook, but it reports and exits like one, so it shares the hooks' wiring. */
export const codegen = makeCicdCommand(
  "codegen",
  `regenerate ${COMPONENT_GENERATED_DIR} against a local Convex backend; commit the result`,
  function* () {
    yield* (yield* connectorModules.ConvexCli).codegenComponent(".");
  },
);
