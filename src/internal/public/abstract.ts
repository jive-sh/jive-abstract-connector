import type { Option } from "effect";

/** What a scaffold is generated for. */
export interface ScaffoldInput {
  /** The new package's npm name, e.g. "jive-connector-package-registry-npm". */
  readonly packageName: string;
  /**
   * The component's name: what `defineComponent` is given and what an installing app reaches it under
   * (`components.<componentName>`), so it must be a JavaScript identifier.
   */
  readonly componentName: string;
}

/** Files to write, by path relative to the package root. */
export type ScaffoldFiles = Readonly<Record<string, string>>;

/**
 * The functions every connector of one kind must expose, checked against the component's generated
 * `ComponentApi` type by the build. A contract is a type and nothing else: a connector depends on the abstract
 * that defines it only to build, so nothing of the abstract ships inside an installing app.
 */
export interface ConnectorContract {
  /**
   * A type exported by `ConnectorAbstract.abstractPackageName`, generic over the component name the way
   * `ComponentApi<Name>` is: `{ <module>: { <function>: FunctionReference<...> } }`. The component must expose
   * each of these functions with exactly this type; it may expose more.
   */
  readonly componentApiType: string;
}

/**
 * One kind of connector: this abstract (`jive-connector`), or an abstract extending it that adds a contract
 * and scaffolds that contract's functions, such as `jive-abstract-connector-package-registry`. Everything
 * else (the hooks, the package layout, the build, the audit and the release) is shared.
 */
export interface ConnectorAbstract {
  /** The abstract's CLI, which scaffolded packages call from their `jive:cicd:*` scripts. */
  readonly cliName: string;
  /** One line for the CLI's help. */
  readonly description: string;
  /**
   * The npm package shipping the CLI. A scaffolded package gets it as a dev dependency from `bun add --dev`, so
   * the version recorded is whatever the registry serves, not one written down here.
   */
  readonly abstractPackageName: string;
  readonly contract: Option.Option<ConnectorContract>;
  /**
   * The component's functions and the example app's, written over the files every connector gets (the
   * manifest, configs, `convex.config.ts`, `schema.ts` and the example app's `convex.config.ts`), so a path
   * listed here replaces the common file of that path.
   */
  readonly scaffold: (input: ScaffoldInput) => ScaffoldFiles;
}
