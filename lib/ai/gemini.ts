import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// API-key pool — reads GEMINI_API_KEY, GEMINI_API_KEY1 … GEMINI_API_KEY5
// ---------------------------------------------------------------------------
function getApiKeys(): string[] {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3,
    process.env.GEMINI_API_KEY4,
    process.env.GEMINI_API_KEY5,
  ];

  const keys = candidates.filter(Boolean) as string[];

  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys configured. Set at least GEMINI_API_KEY in .env"
    );
  }

  return keys;
}

function clientForKey(keys: string[], index: number): GoogleGenAI {
  return new GoogleGenAI({ apiKey: keys[index % keys.length] });
}

// ---------------------------------------------------------------------------
// Error classification
//
// skipKey  → auth/permission error on this key, move to next key immediately
// skipModel → model unavailable/not-found, try next model on same key
// retryable → transient (quota/overload), try next model then next key
// fatal    → bad request or unknown — stop entirely
// ---------------------------------------------------------------------------
type ErrorKind = "skipKey" | "skipModel" | "retryable" | "fatal";

function classifyError(err: any): ErrorKind {
  const status: number | undefined = err?.status ?? err?.statusCode;
  const message: string = String(err?.message ?? "").toLowerCase();

  // Auth / permission → skip this key entirely
  if (status === 401 || status === 403) return "skipKey";
  if (message.includes("permission_denied") || message.includes("denied access")) return "skipKey";

  // Model not found → skip this model, try next one on same key
  if (status === 404) return "skipModel";
  if (message.includes("not_found") || message.includes("no longer available")) return "skipModel";

  // Quota / rate-limit / overload → retryable across models + keys
  if (status === 429 || status === 503 || status === 500) return "retryable";
  if (
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  ) return "retryable";

  // Everything else (400 bad request, etc.) — stop
  return "fatal";
}

// ---------------------------------------------------------------------------
// Primary export: generateAIContent
// Strategy:
//   outer loop: each API key
//   inner loop: each model name
//   - skipModel / retryable → continue inner loop
//   - skipKey              → break inner loop, next key
//   - fatal               → throw immediately
// ---------------------------------------------------------------------------
export async function generateAIContent(params: {
  contents: any[];
  model?: string;
}): Promise<{ text: string }> {
  const keys = getApiKeys();

  // gemini-3.8-flash is the current free-tier model (gemini-2.5-flash deprecated)
  const preferredModel = params.model ?? "gemini-3.8-flash";
  const modelFallbacks = Array.from(
    new Set([
      preferredModel,
      "gemini-3.8-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest",
    ])
  );

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const client = clientForKey(keys, keyIdx);
    const keyLabel = `key[${keyIdx}]`;

    for (const modelName of modelFallbacks) {
      try {
        console.log(`🔑 Gemini ${keyLabel} → model "${modelName}"`);

        const res = await (client as any).models.generateContent({
          model: modelName,
          contents: params.contents,
        });

        const text: string = (res as any).text ?? "";
        if (text) {
          return { text };
        }

        console.warn(`⚠️ Gemini ${keyLabel} / "${modelName}" returned empty text, trying next model.`);
        lastError = new Error("Empty response from Gemini");
        // continue to next model
      } catch (err: any) {
        const kind = classifyError(err);
        console.warn(`⚠️ Gemini ${keyLabel} / "${modelName}" [${kind}]: ${err?.message ?? err}`);
        lastError = err;

        if (kind === "fatal") {
          throw new Error(`AI generation failed (fatal): ${err?.message ?? err}`);
        }

        if (kind === "skipKey") {
          // This key has an auth problem — no point trying other models with it
          break; // break inner loop → next key
        }

        // "skipModel" or "retryable" → continue inner loop to next model
      }
    }
  }

  throw new Error(
    `AI generation failed after trying all ${keys.length} API key(s) and all models: ${lastError?.message ?? "Unknown error"}`
  );
}

// ---------------------------------------------------------------------------
// Legacy compat: gemini.models.generateContent now routes through key rotation
// ---------------------------------------------------------------------------
export const gemini = {
  models: {
    generateContent: (params: { model?: string; contents: any[] }) =>
      generateAIContent(params),
  },
} as const;

// Simple single-key client helper (for one-off use; prefer generateAIContent)
export function getGeminiClient(): GoogleGenAI {
  const keys = getApiKeys();
  return new GoogleGenAI({ apiKey: keys[0] });
}