import { Option, Schema } from "effect";
import { GENERATED_PACKAGE_JSON_FIELDS, makeJivePackageJsonSchema } from "jive-abstract-library";

/**
 * The shape a connector package's package.json must have: the fields every Jive package has, with no block of
 * this abstract's own under `jive`. A connector's configuration lives where Convex reads it: its name and
 * environment variables in `src/component/convex.config.ts`, the values in the installing app's `app.use`.
 */

/**
 * Fields the build writes into the published manifest from the files it finds (`exports` lists the component's
 * entry points), so a source package.json must not set them.
 */
export const GENERATED_FIELDS = [...GENERATED_PACKAGE_JSON_FIELDS, "main", "module", "types"] as const;

const generatedFields = Object.fromEntries(
  GENERATED_FIELDS.map((field) => [field, Schema.optionalKey(Schema.Never)]),
) as { readonly [Field in (typeof GENERATED_FIELDS)[number]]: Schema.optionalKey<typeof Schema.Never> };

function hasConvex(dependencies: Option.Option<Readonly<Record<string, string>>>): boolean {
  return Option.exists(dependencies, (record) => record["convex"] !== undefined);
}

/**
 * A connector's package.json. `convex` must be a peer dependency, because the installing app's copy is the one
 * that runs the component, and a dev dependency, because building and auditing the package run it.
 */
export const PackageJsonSchema = Schema.Struct({ ...makeJivePackageJsonSchema({}).fields, ...generatedFields }).check(
  Schema.makeFilter((packageJson) => {
    const problems = [
      ...(hasConvex(packageJson.peerDependencies) ? [] : [`"convex" must be in peerDependencies: the installing app's copy runs the component`]),
      ...(hasConvex(packageJson.devDependencies) ? [] : [`"convex" must be in devDependencies: building and auditing the component run it`]),
    ];
    return problems.length === 0 ? undefined : problems.join("\n");
  }),
);
export type PackageJson = typeof PackageJsonSchema.Type;

/** The `jive` block `get-config` prints. */
export const JivePackageConfig = PackageJsonSchema.fields.jive;
