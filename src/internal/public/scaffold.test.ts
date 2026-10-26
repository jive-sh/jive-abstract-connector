import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { connectorAbstract } from "./connector";
import { PackageJsonSchema } from "./manifest";
import { commonScaffoldFiles, defaultComponentName } from "./scaffold";

describe("defaultComponentName", () => {
  test("drops the scope and the jive-connector- prefix, then camelCases", () => {
    expect(defaultComponentName("jive-connector-package-registry-npm")).toBe("packageRegistryNpm");
    expect(defaultComponentName("@acme/jive-connector-slack")).toBe("slack");
    expect(defaultComponentName("my_connector.v2")).toBe("myConnectorV2");
  });

  test("gives nothing when the result is not an identifier", () => {
    expect(defaultComponentName("jive-connector-2fa")).toBeUndefined();
  });
});

test("the scaffolded package.json satisfies the schema the hooks decode it with", () => {
  const files = commonScaffoldFiles(connectorAbstract, { packageName: "jive-connector-example", componentName: "example" });
  const decoded = Schema.decodeUnknownSync(PackageJsonSchema)(JSON.parse(files["package.json"]!));
  expect(decoded.scripts["jive:cicd:audit"]).toBe("jive-connector cicd audit");
});

test("the schema refuses a manifest without convex as a peer dependency, or with fields the build generates", () => {
  const files = commonScaffoldFiles(connectorAbstract, { packageName: "jive-connector-example", componentName: "example" });
  const packageJson = JSON.parse(files["package.json"]!);
  expect(() => Schema.decodeUnknownSync(PackageJsonSchema)({ ...packageJson, peerDependencies: {} }))
    .toThrow(`"convex" must be in peerDependencies`);
  expect(() => Schema.decodeUnknownSync(PackageJsonSchema)({ ...packageJson, exports: { ".": "./x.js" } })).toThrow();
});
