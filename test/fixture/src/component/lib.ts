import { v } from "convex/values";
import { env, query } from "./_generated/server";

/** Answers without touching the outside system, so an installing app can check the component is installed. */
export const ping = query({
  args: {},
  returns: v.literal("pong"),
  handler: async () => "pong" as const,
});

/** Reads a variable the component declares, so the audit proves the installing app's value reaches it. */
export const greet = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (_ctx, { name }) => `${env.GREETING}, ${name}`,
});
