// Server-only. Generate a single 1536-dimensional embedding via OpenRouter's
// OpenAI-compatible /embeddings endpoint. Falls back to OpenAI if a direct
// key is provided. Returns null if no provider is configured (graceful
// degradation — search/recommendations fall back to FTS).

const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";
const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const MODEL = process.env.OPENAI_EMBED_MODEL ?? "openai/text-embedding-3-small";
const DIM = 1536;

interface EmbedResponse {
  data: Array<{ embedding: number[] }>;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}

export async function embed(input: string): Promise<number[] | null> {
  const text = cleanText(input);
  if (!text) return null;

  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // Prefer OpenAI directly when available — cheaper + more reliable for
  // embeddings. OpenRouter works but charges a small markup.
  const direct = openaiKey
    ? { url: OPENAI_URL, key: openaiKey, model: MODEL.replace(/^openai\//, "") }
    : openrouterKey
    ? { url: OPENROUTER_URL, key: openrouterKey, model: MODEL }
    : null;

  if (!direct) return null;

  try {
    const res = await fetch(direct.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${direct.key}`,
        "Content-Type": "application/json",
        ...(direct.url === OPENROUTER_URL
          ? {
              "HTTP-Referer":
                process.env.OPENROUTER_APP_URL ?? "https://petroconnect.app",
              "X-Title": process.env.OPENROUTER_APP_NAME ?? "PetroConnect",
            }
          : {}),
      },
      body: JSON.stringify({ model: direct.model, input: text }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[embed] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const json = (await res.json()) as EmbedResponse;
    const vec = json.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== DIM) {
      console.error("[embed] unexpected dimension", vec?.length);
      return null;
    }
    return vec;
  } catch (err) {
    console.error("[embed] request failed", err);
    return null;
  }
}

/**
 * Fingerprint a listing for fast dedupe at the SQL layer. This is a
 * lossy normalization of title + key description tokens — useful as a
 * coarse pre-filter before semantic similarity.
 */
export function fingerprint(title: string, description: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length > 2)
      .sort()
      .slice(0, 12)
      .join(" ");
  return normalize(`${title} ${description}`);
}
