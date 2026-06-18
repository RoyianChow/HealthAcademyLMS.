import arcjet, { fixedWindow } from "@/lib/arcjet";

/** Per-user rate limits for chat API routes. */
export const chatPostLimiter = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 15,
  })
);

export const chatReadLimiter = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 60,
  })
);

export async function enforceChatRateLimit(
  request: Request,
  fingerprint: string,
  limiter: ReturnType<typeof arcjet.withRule>
) {
  const decision = await limiter.protect(request, { fingerprint });

  if (decision.isDenied()) {
    return {
      denied: true as const,
      response: Response.json(
        { error: "Too many chat requests. Please try again later." },
        { status: 429 }
      ),
    };
  }

  return { denied: false as const };
}
