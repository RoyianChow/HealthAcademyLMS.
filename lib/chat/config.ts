import { z } from "zod";

const configSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  CHATBOT_DEFAULT_USER_ID: z.string().min(1).default("user-alex"),
});

export async function getChatConfig() {
  const parsed = configSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    CHATBOT_DEFAULT_USER_ID: process.env.CHATBOT_DEFAULT_USER_ID,
  });

  return {
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiModel: parsed.OPENAI_MODEL,
    defaultUserId: parsed.CHATBOT_DEFAULT_USER_ID,
  };
}
