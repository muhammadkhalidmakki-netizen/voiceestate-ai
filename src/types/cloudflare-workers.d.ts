// Types for the Cloudflare Worker runtime module. It only exists inside the deployed Worker.
declare module "cloudflare:workers" {
  export const env: {
    /** KV namespace holding the saved plans (bound as PLANS in cloudflare.config.ts). */
    PLANS?: unknown;
    [binding: string]: unknown;
  };
}
