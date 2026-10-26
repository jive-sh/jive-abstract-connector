import { Command } from "commander";
import { cicdCommand } from "../commands/cicd";
import { codegen } from "../commands/codegen";
import { createCommand } from "../commands/create";
import { dev } from "../commands/dev";
import type { ConnectorAbstract } from "./abstract";

/**
 * The CLI of a connector kind: the six hooks, `create`, `codegen` and `dev`. `jive-connector` is this applied to
 * `connectorAbstract`; an abstract extending this one calls it with its own definition from its own entrypoint.
 */
export function makeConnectorCli(abstract: ConnectorAbstract): Command {
  return new Command(abstract.cliName)
    .description(abstract.description)
    .addCommand(cicdCommand(abstract))
    .addCommand(createCommand(abstract))
    .addCommand(codegen)
    .addCommand(dev);
}

/** Parses the process's arguments with the kind's CLI; the body of an abstract's entrypoint. */
export function runConnectorCli(abstract: ConnectorAbstract): void {
  const program = makeConnectorCli(abstract);
  program.parse();
  if (process.argv.length <= 2) program.help();
}
