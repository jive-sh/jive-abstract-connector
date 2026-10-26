import type { EffectGen } from "effective-modules";
import type { ConnectorContract } from "../../public/abstract";

export interface IContract {
  /**
   * Typechecks the component's generated `ComponentApi` against a contract type: every function the contract
   * names must exist, with exactly the contract's kind, arguments and return type. Fails naming each function
   * that is missing or differs.
   */
  check(input: { readonly contract: ConnectorContract; readonly abstractPackageName: string }): EffectGen<void, string>;
}
