import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "voiceestate-ai",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-09-29",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      // Saved plans for the Dubai planner (shared by everyone who signs in; survives browser changes).
      PLANS: bindings.kv({ id: "1b36334c77064cac8c7907319688d632" }),
    },
  }),
});
