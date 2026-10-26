import type { ConnectorContract } from "../../public/abstract";

/**
 * The TypeScript file whose compilation is the contract check. A component name is fixed so both sides of the
 * comparison carry the same `Name` parameter. `Equal` is the exact-type comparison (each side assignable to
 * the other is too weak: an extra required argument would pass).
 */
export function contractCheckSource(input: {
  readonly contract: ConnectorContract;
  readonly abstractPackageName: string;
  readonly componentApiImport: string;
}): string {
  const { componentApiType } = input.contract;
  return [
    `import type { ComponentApi } from ${JSON.stringify(input.componentApiImport)};`,
    `import type { ${componentApiType} } from ${JSON.stringify(input.abstractPackageName)};`,
    ``,
    `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;`,
    ``,
    `type Problems<Api, Contract> = {`,
    `  [Module in keyof Contract & string]: Module extends keyof Api`,
    `    ? {`,
    `        [Fn in keyof Contract[Module] & string]: Fn extends keyof Api[Module]`,
    `          ? Equal<Api[Module][Fn], Contract[Module][Fn]> extends true`,
    `            ? never`,
    `            : \`\${Module}.\${Fn} does not have the contract's kind, arguments or return type\``,
    `          : \`\${Module}.\${Fn} is missing\``,
    `      }[keyof Contract[Module] & string]`,
    `    : \`the module \${Module} is missing\``,
    `}[keyof Contract & string];`,
    ``,
    `type Result = [Problems<ComponentApi<"connector">, ${componentApiType}<"connector">>] extends [never]`,
    `  ? true`,
    `  : Problems<ComponentApi<"connector">, ${componentApiType}<"connector">>;`,
    ``,
    `export const satisfiesContract: Result = true;`,
    ``,
  ].join("\n");
}
