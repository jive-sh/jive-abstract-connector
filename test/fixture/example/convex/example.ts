import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  returns: v.literal("pong"),
  handler: (ctx) => ctx.runQuery(components.fixture.lib.ping, {}),
});

export const greet = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: (ctx, { name }) => ctx.runQuery(components.fixture.lib.greet, { name }),
});
