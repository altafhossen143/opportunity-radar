import { defineNitroPlugin } from "@agent-native/core/server";
import {
  createAISDKEngine,
  registerAgentEngine,
} from "@agent-native/core/agent/engine";

const META_BASE_URL = "https://api.meta.ai/v1";
const SPARK_MODEL = "muse-spark-1.3-contributor";

// Why this engine exists: the framework's built-in provider fetch builds its
// own undici Agent with no proxy support, so in a sandbox whose egress goes
// through an HTTP proxy every LLM call dies at the TLS handshake ("wrong
// version number"). The global fetch honours NODE_USE_ENV_PROXY and reaches
// api.meta.ai through the proxy. The Vercel AI SDK substitutes its own
// "safe" fetch whenever the fetch it is given IS the global fetch, so this
// wrapper (a different function object that delegates to it) is required —
// never pass globalThis.fetch itself.
const proxyAwareFetch: typeof fetch = (input, init) =>
  globalThis.fetch(input, init);

export default defineNitroPlugin(() => {
  registerAgentEngine({
    name: "meta-spark",
    label: "Meta Spark",
    description:
      "Muse Spark via the Meta Model API (OpenAI-compatible). Uses OPENAI_API_KEY / OPENAI_BASE_URL from the environment.",
    capabilities: {
      thinking: true,
      promptCaching: false,
      vision: true,
      computerUse: false,
      parallelToolCalls: true,
    },
    defaultModel: SPARK_MODEL,
    supportedModels: ["muse-spark-1.3-contributor", "muse-spark-1.3"],
    acceptsCustomModels: true,
    requiredEnvVars: ["OPENAI_API_KEY"],
    create: (config) =>
      createAISDKEngine("openai", {
        ...config,
        model: config.model ?? SPARK_MODEL,
        baseUrl: META_BASE_URL,
        requestFetch: proxyAwareFetch,
      }),
  });
});
