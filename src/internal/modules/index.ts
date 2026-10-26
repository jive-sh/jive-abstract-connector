import { interfaces } from "effective-modules";
import type { IComponentPackage } from "./component-package/interface";
import type { IContract } from "./contract/interface";
import type { IConvexCli } from "./convex-cli/interface";
import type { IExampleApp } from "./example-app/interface";
import type { IPackage } from "./package/interface";
import type { IProcess } from "./process/interface";
import type { IRelease } from "./release/interface";
import type { IScaffold } from "./scaffold/interface";
import type { ITypeScript } from "./typescript/interface";

export enum ConnectorModules {
  Process = "Process",
  Package = "Package",
  TypeScript = "TypeScript",
  ConvexCli = "ConvexCli",
  ComponentPackage = "ComponentPackage",
  Contract = "Contract",
  ExampleApp = "ExampleApp",
  Release = "Release",
  Scaffold = "Scaffold",
}

export const connectorModules = interfaces<ConnectorModules, {
  Process: IProcess;
  Package: IPackage;
  TypeScript: ITypeScript;
  ConvexCli: IConvexCli;
  ComponentPackage: IComponentPackage;
  Contract: IContract;
  ExampleApp: IExampleApp;
  Release: IRelease;
  Scaffold: IScaffold;
}>(ConnectorModules);
