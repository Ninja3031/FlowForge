import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { env } from "../config/env";
import { HttpError } from "../lib/http-error";

// API key stays on the server. The browser never talks to the AI provider directly.
const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

export const aiMode = client ? "live" : "demo";

interface AskOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  // Used when no API key is set, so the app still works in demos and tests
  demo: () => T;
}

// Pull the JSON object out of the model's reply (it sometimes wraps it in ```json fences)
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
}

// Ask the model for JSON, then validate it. Retry once if the shape is wrong.
export async function askJson<T>({ system, prompt, schema, maxTokens = 1500, demo }: AskOptions<T>): Promise<T> {
  if (!client) return demo();

  for (let attempt = 1; attempt <= 2; attempt++) {
    const message = await client.messages.create({
      model: env.aiModel,
      max_tokens: maxTokens,
      system: `${system}\n\nReply with only a single JSON object. No markdown, no extra text.`,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    try {
      const result = schema.safeParse(extractJson(text));
      if (result.success) return result.data;
      console.warn(`AI reply failed validation (attempt ${attempt}):`, result.error.issues);
    } catch (err) {
      console.warn(`AI reply was not JSON (attempt ${attempt}):`, err);
    }
  }

  throw new HttpError(502, "The AI gave an unexpected answer. Please try again.");
}