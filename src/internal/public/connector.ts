import { Option } from "effect";
import type { ConnectorAbstract } from "./abstract";
import { connectorScaffold } from "./scaffold";

/** This abstract's own kind: a connector with no contract beyond being an installable Convex component. */
export const connectorAbstract: ConnectorAbstract = {
  cliName: "jive-connector",
  description: "scaffold, build, audit and publish a Jive connector: a Convex component linking Jive to an outside system",
  abstractPackageName: "jive-abstract-connector",
  contract: Option.none(),
  scaffold: connectorScaffold,
};
