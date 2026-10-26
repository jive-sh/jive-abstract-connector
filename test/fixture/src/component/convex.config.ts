import { defineComponent } from "convex/server";
import { v } from "convex/values";

export default defineComponent("fixture", {
  env: {
    GREETING: v.string(),
  },
});
