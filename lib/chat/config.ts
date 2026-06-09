import { z } from "zod";

const providerSchema = z.enum(["openai", "openrouter"]).default("openai");

const configSchema = z.object({
  CHAT_PROVIDER: providerSchema,
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().min(1).default("openai/gpt-4o-mini"),
});

export type ChatProviderConfig = {
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  provider: "openai" | "openrouter";
};

export async function getChatConfig(): Promise<ChatProviderConfig> {
  const parsed = configSchema.parse({
    CHAT_PROVIDER: process.env.CHAT_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  });

  if (parsed.CHAT_PROVIDER === "openrouter") {
    return {
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: parsed.OPENROUTER_API_KEY,
      model: parsed.OPENROUTER_MODEL,
    };
  }

  return {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: parsed.OPENAI_API_KEY,
    model: parsed.OPENAI_MODEL,
  };
}
