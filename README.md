# jive-abstract-connector

A Jive abstract for **connectors**. A connector links Jive to an outside system (npm, Slack, a database), and is
a [Convex component](https://docs.convex.dev/components/authoring) published to npm: a Convex app such as
`@jive-sh/server` installs it with `app.use(...)` and calls its functions through `components.<name>`.

This package gives a connector package its scaffold, its package.json schema, and the six CI/CD hooks Jive's
reusable pipeline calls ([CICD_API.md](https://github.com/jive-sh/jive/blob/main/CICD_API.md)), through the
`jive-connector` CLI. It is a library, not a Convex component itself.

## Create a connector

```sh
bunx jive-connector create jive-connector-example
```

That writes the package, adds `jive-abstract-connector` as a dev dependency, installs, and generates the
component's code, so the result builds as it stands. The target UX is `jive create connector`, which will
resolve this package; `jive create` is not built yet. Options: `--name <npm name>` (default: the directory's
name), `--component <identifier>` (default: the name without `jive-connector-`, camelCased, e.g.
`jive-connector-example-system` → `exampleSystem`), `--no-install` (only write the files).

## Package layout

```text
package.json                 the six jive:cicd:* scripts call `jive-connector cicd <hook>`
src/component/convex.config.ts   defineComponent("<name>", { env: { ... } })
src/component/schema.ts          the component's own tables
src/component/*.ts               its functions
src/component/_generated/        written by `bun run codegen`, committed
src/client/index.ts              optional typed wrapper, published as the package's main entry
example/convex/                  a Convex app installing the component with app.use: the usage example, and what audit pushes
convex.json                      {"functions": "example/convex"}
```

`src/component/_generated` is committed because Convex generates it by analysing the component on a running
backend. `bun run codegen` (`jive-connector codegen`) starts an anonymous deployment on a local backend that the
`convex` CLI downloads and runs itself, so it needs no Convex account; the same is true of `audit`.

### Environment variables

A component declares the variables it reads, and the installing app supplies them:

```ts
// src/component/convex.config.ts
export default defineComponent("example", { env: { API_TOKEN: v.string() } });

// the app's convex/convex.config.ts
app.use(example, { env: { API_TOKEN: app.env.EXAMPLE_API_TOKEN } });
```

Functions read them from `env` in `./_generated/server`. The example app passes values too, which is what makes
audit's push succeed.

## package.json

The fields every Jive package has (`jive.cicd` and the six hooks, from
[`jive-abstract-library`](https://github.com/jive-sh/jive-abstract-library)), with no block of this abstract's
own under `jive`: a connector's configuration is in `convex.config.ts`. Two further rules:

- `convex` is a peer dependency (the installing app's copy runs the component) and a dev dependency.
- `files`, `exports`, `repository`, `main`, `module` and `types` are banned: the build writes them.

`jive-connector dev` keeps `package.schema.json`, which `$schema` points at, current for the editor.

## The hooks

| Hook | What it does |
| --- | --- |
| `get-config` | Prints the validated `jive` block. |
| `build` | Emits `src/` with declarations into `dist/package/dist`, copies `src/` beside it, and writes the published manifest at `<version>-local`. Its `exports` are `./convex.config.js` and `./_generated/component.js` (types only), plus `.` when `src/client/index.ts` exists. An abstract with a contract also checks it here (below). |
| `audit` | Typechecks the package; regenerates `src/component/_generated` and fails if that changed a file; packs `dist/package`, installs the tarball into a copy of `example/convex` under `dist/audit-app`, and pushes that app to a local backend. The push is where Convex bundles the component, typechecks the app's calls and checks the app passes every required variable. |
| `deploy:plan` | Plans a deploy to the npm page of the version the environment publishes, printing e.g. `{"deploy":true,"url":"https://www.npmjs.com/package/<name>/v/1.2.0"}`. |
| `upload-artifacts` | Nothing. |
| `deploy` | Stamps the environment's version (`latest` → `X.Y.Z`, others prereleased, as `jive-abstract-library` releases) and the pipeline's repository onto the built manifest, and publishes it under the environment's dist-tag. Fails first if that version is already published. |

A package that needs more replaces one script and keeps the rest, e.g.
`"jive:cicd:audit": "jive-connector cicd audit && bun test"`.

## Connector kinds with a contract

A kind of connector, such as a package registry, is an abstract extending this one. It defines the functions
every connector of that kind exposes as a type, and its CLI is this package's applied to its own definition:

```ts
// src/entrypoints/jive-connector-package-registry.ts in jive-abstract-connector-package-registry
import { Option } from "effect";
import { runConnectorCli } from "jive-abstract-connector";

runConnectorCli({
  cliName: "jive-connector-package-registry",
  description: "…",
  abstractPackageName: "jive-abstract-connector-package-registry",
  contract: Option.some({ componentApiType: "PackageRegistryComponentApi" }),
  scaffold: packageRegistryScaffold,
});
```

`build` then compiles a check that the component's generated `ComponentApi` has every function the contract
type names, with exactly its kind, arguments and return type, and fails naming each one that is missing or
differs. The contract is a type only, so the connector depends on its abstract only to build.

## Limitations

- `jive create connector` is not built: `jive create` does not resolve abstracts yet. Use `jive-connector create`.
- The local backend `codegen` and `audit` start has listened on port 3210 in every run so far; two runs at once
  on one machine have not been tried.
- Nothing here tests a component's functions against its outside system; a package adds its own tests to `audit`.
