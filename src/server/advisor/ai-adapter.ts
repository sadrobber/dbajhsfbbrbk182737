import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * ============================================================================
 *  AI PROVIDER ADAPTER: the only file that knows about AI vendors.
 * ============================================================================
 *
 *  The advisor asks for one thing: "given these instructions and this
 *  conversation, return a JSON object matching this schema" (generateObject).
 *  Choose the provider with environment variables (see .env.example):
 *
 *    AI_PROVIDER=demo               no AI, rule-based answers (default)
 *    AI_PROVIDER=anthropic          Claude, through the official Anthropic SDK
 *    AI_PROVIDER=openai-compatible  any OpenAI-compatible Chat Completions API
 *
 *  API keys are read on the server only and never reach the browser.
 *  To support another vendor, add a case in getAiClient() below.
 */

export type AiMessage = { role: "user" | "assistant"; content: string };

export type GenerateObjectRequest<T> = {
  system: string;
  messages: AiMessage[];
  schema: z.ZodType<T>;
  schemaName: string;
};

export interface AiClient {
  readonly provider: string;
  readonly model: string;
  generateObject<T>(request: GenerateObjectRequest<T>): Promise<T>;
}

export class AiProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { cause?: unknown; retryable?: boolean } = {}) {
    super(message, { cause: options.cause });
    this.name = "AiProviderError";
    this.retryable = options.retryable ?? false;
  }
}

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function timeoutMs(): number {
  const seconds = Number(env("AI_TIMEOUT_SECONDS"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000;
}

const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[advisor] ${message}`);
}

let cached: { key: string; client: AiClient | null } | undefined;

/** The configured AI client, or null for demo mode. */
export function getAiClient(): AiClient | null {
  const provider = (env("AI_PROVIDER") ?? "demo").toLowerCase();
  const key = [
    provider,
    env("AI_MODEL"),
    env("AI_BASE_URL"),
    env("AI_FALLBACKS"),
    Boolean(env("AI_API_KEY") ?? env("ANTHROPIC_API_KEY")),
  ].join("|");
  if (cached?.key === key) return cached.client;

  let client: AiClient | null = null;
  switch (provider) {
    case "demo":
      break;
    case "anthropic":
      client = createAnthropicClient();
      break;
    case "openai-compatible":
    case "openai":
      client = createOpenAiCompatibleClient();
      break;
    default:
      warnOnce(`Unknown AI_PROVIDER "${provider}". Using demo mode.`);
  }
  cached = { key, client };
  return client;
}

// ---------------------------------------------------------------------------
// Anthropic (Claude), official SDK
// ---------------------------------------------------------------------------

function createAnthropicClient(): AiClient | null {
  const apiKey = env("AI_API_KEY") ?? env("ANTHROPIC_API_KEY");
  if (!apiKey) {
    warnOnce("AI_PROVIDER=anthropic but neither AI_API_KEY nor ANTHROPIC_API_KEY is set. Using demo mode.");
    return null;
  }
  const model = env("AI_MODEL") ?? DEFAULT_ANTHROPIC_MODEL;
  // Server-side fallback: if the model declines for policy reasons, Anthropic
  // retries on its recommended fallback model within the same call.
  const useFallbacks = (env("AI_FALLBACKS") ?? "default").toLowerCase() !== "off";

  let sdk: Promise<{ Sdk: typeof Anthropic; client: Anthropic }> | undefined;
  const loadSdk = () =>
    (sdk ??= import("@anthropic-ai/sdk").then(({ default: Sdk }) => ({
      Sdk,
      client: new Sdk({ apiKey, timeout: timeoutMs(), maxRetries: 1 }),
    })));

  return {
    provider: "anthropic",
    model,
    async generateObject<T>({ system, messages, schema }: GenerateObjectRequest<T>): Promise<T> {
      const [{ Sdk, client }, { betaZodOutputFormat }] = await Promise.all([
        loadSdk(),
        import("@anthropic-ai/sdk/helpers/beta/zod"),
      ]);
      try {
        const response = await client.beta.messages.parse({
          model,
          max_tokens: 16000,
          system,
          messages,
          // Short structured answers for a live chat: low effort keeps it fast.
          output_config: { effort: "low", format: betaZodOutputFormat(schema) },
          // Reuses the cached instructions + catalogue between questions.
          cache_control: { type: "ephemeral" },
          ...(useFallbacks
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        });

        if (response.stop_reason === "refusal") throw new AiProviderError("The model declined to answer.");
        if (response.stop_reason === "max_tokens") throw new AiProviderError("The answer was cut off.");
        if (response.parsed_output == null) {
          throw new AiProviderError("The answer did not match the expected format.");
        }
        return response.parsed_output as T;
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        if (error instanceof Sdk.AuthenticationError) {
          throw new AiProviderError("Anthropic rejected the API key (401).", { cause: error });
        }
        if (error instanceof Sdk.PermissionDeniedError) {
          throw new AiProviderError("This API key may not use this model (403).", { cause: error });
        }
        if (error instanceof Sdk.NotFoundError) {
          throw new AiProviderError(`Model "${model}" was not found (404). Check AI_MODEL.`, { cause: error });
        }
        if (error instanceof Sdk.RateLimitError) {
          throw new AiProviderError("Anthropic rate limit reached (429).", { cause: error, retryable: true });
        }
        if (error instanceof Sdk.BadRequestError) {
          throw new AiProviderError(`Anthropic rejected the request (400): ${error.message}`, { cause: error });
        }
        if (error instanceof Sdk.APIConnectionTimeoutError) {
          throw new AiProviderError("Anthropic did not answer in time.", { cause: error, retryable: true });
        }
        if (error instanceof Sdk.APIError) {
          throw new AiProviderError(`Anthropic API error (${error.status ?? "network"}).`, {
            cause: error,
            retryable: true,
          });
        }
        const detail = error instanceof Error ? `: ${error.message.slice(0, 300)}` : "";
        throw new AiProviderError(`Unexpected error while calling Anthropic${detail}`, { cause: error });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Any OpenAI-compatible Chat Completions API (OpenAI, Mistral, Groq, OpenRouter,
// a local Ollama...). Plain HTTP, no extra dependency.
// ---------------------------------------------------------------------------

function createOpenAiCompatibleClient(): AiClient | null {
  const model = env("AI_MODEL");
  if (!model) {
    warnOnce("AI_PROVIDER=openai-compatible needs AI_MODEL. Using demo mode.");
    return null;
  }
  const apiKey = env("AI_API_KEY");
  const baseUrl = (env("AI_BASE_URL") ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");

  return {
    provider: "openai-compatible",
    model,
    async generateObject<T>({ system, messages, schema, schemaName }: GenerateObjectRequest<T>): Promise<T> {
      const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: `${system}\n\nAnswer with one JSON object and nothing else, matching this JSON Schema ("${schemaName}"):\n${jsonSchema}`,
              },
              ...messages,
            ],
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(timeoutMs()),
          cache: "no-store",
        });
      } catch (error) {
        throw new AiProviderError(`Could not reach ${baseUrl}.`, { cause: error, retryable: true });
      }

      if (!response.ok) {
        throw new AiProviderError(`${baseUrl} answered HTTP ${response.status}.`, {
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const data = (await response.json().catch(() => null)) as {
        choices?: { message?: { content?: unknown } }[];
      } | null;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new AiProviderError("The answer had no text.");

      let json: unknown;
      try {
        json = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
      } catch (error) {
        throw new AiProviderError("The answer was not valid JSON.", { cause: error });
      }
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new AiProviderError("The answer did not match the expected format.", { cause: parsed.error });
      }
      return parsed.data;
    },
  };
}
