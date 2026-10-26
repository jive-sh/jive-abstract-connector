# jive-abstract-connector-fixture

A Jive connector: a Convex component, `fixture`, published to npm. It extends
`jive-abstract-connector`, whose `jive-connector` CLI builds, audits and publishes it.

## Install it in a Convex app

```ts
// convex/convex.config.ts
import fixture from "jive-abstract-connector-fixture/convex.config.js";

const app = defineApp();
app.use(fixture); // pass { env: { ... } } if the component declares environment variables
export default app;
```

The app then calls its functions through `components.fixture`. `example/convex` is a working example.

## Work on it

- `src/component/` is the component. After changing its functions, run `bun run codegen`, which regenerates
  `src/component/_generated` against a local Convex backend (no Convex account needed). Commit the result.
- `bun run jive:cicd:build` emits the package into `dist/package`; `bun run jive:cicd:audit` checks the
  committed generated code is current and pushes `example/convex`, with the built package installed, to a local backend.
- A push to `main` publishes the version in package.json to npm, so bump it with every change meant for `main`.
