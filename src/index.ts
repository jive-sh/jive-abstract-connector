/**
 * The public surface of this abstract. A connector package reaches the hooks through the `jive-connector` CLI;
 * what is exported here is for abstracts extending this one (a connector kind with a contract): the CLI built
 * from a kind's definition, the scaffold pieces to compose, and the package.json schema.
 */
export type { ConnectorAbstract, ConnectorContract, ScaffoldFiles, ScaffoldInput } from "./internal/public/abstract";
export { makeConnectorCli, runConnectorCli } from "./internal/public/cli";
export { connectorAbstract } from "./internal/public/connector";
export { GENERATED_FIELDS, JivePackageConfig, PackageJsonSchema, type PackageJson } from "./internal/public/manifest";
export {
  commonScaffoldFiles,
  componentConfigSource,
  connectorScaffold,
  defaultComponentName,
  exampleAppConfigSource,
} from "./internal/public/scaffold";
