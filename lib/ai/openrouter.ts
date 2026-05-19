// Thin OpenRouter wrapper. Server-side only.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  response_format?: { type: "json_object" } | { type: "text" };
  max_tokens?: number;
}

/**
 * Specific error so API routes can return a friendly 503 instead of a
 * generic 500 when the OpenRouter key is missing. Routes check
 * `err instanceof AINotConfiguredError`.
 */
export class AINotConfiguredError extends Error {
  constructor() {
    super("AI is not configured — add OPENROUTER_API_KEY to .env.local");
    this.name = "AINotConfiguredError";
  }
}

export function isAIConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function chat(
  messages: ChatMessage[],
  opts: OpenRouterOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AINotConfiguredError();
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_APP_URL ?? "https://petroconnect.app",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "PetroConnect",
    },
    body: JSON.stringify({
      model: opts.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      temperature: opts.temperature ?? 0.5,
      response_format: opts.response_format,
      max_tokens: opts.max_tokens ?? 600,
      messages,
    }),
    // Keep responses fresh; never cache LLM calls.
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0]?.message?.content ?? "";
}

export async function chatJSON<T>(
  messages: ChatMessage[],
  opts: OpenRouterOptions = {},
): Promise<T> {
  const text = await chat(messages, {
    ...opts,
    response_format: { type: "json_object" },
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    // Some models occasionally wrap JSON in code fences.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return JSON.parse(fenced[1]) as T;
    throw new Error(`AI did not return valid JSON: ${text.slice(0, 200)}`);
  }
}
