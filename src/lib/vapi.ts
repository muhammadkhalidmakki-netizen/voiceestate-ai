import Vapi from "@vapi-ai/web";

// @vapi-ai/web is CommonJS (`exports.default = Vapi`). Next.js unwraps that,
// but the Vite build used for Cloudflare hands back the module object instead.
const VapiClass: typeof Vapi =
  (Vapi as unknown as { default?: typeof Vapi }).default ?? Vapi;

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

let client: Vapi | null = null;

export function isVapiConfigured(): boolean {
  return Boolean(publicKey && assistantId);
}

export function getVapiAssistantId(): string {
  if (!assistantId) {
    throw new Error("NEXT_PUBLIC_VAPI_ASSISTANT_ID is not set in .env.local");
  }
  return assistantId;
}

// Browser-only singleton. Creating the client does not start a call.
export function getVapiClient(): Vapi {
  if (typeof window === "undefined") {
    throw new Error("The Vapi client can only be used in the browser");
  }
  if (!publicKey) {
    throw new Error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set in .env.local");
  }
  if (!client) {
    client = new VapiClass(publicKey);
  }
  return client;
}
