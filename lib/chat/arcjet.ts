type ChatLimiter = {
  protect: (
    request: Request,
    options?: {
      fingerprint?: string;
    }
  ) => Promise<{
    isDenied: () => boolean;
  }>;
};

/** Temporary no-op limiter while Arcjet is disabled. */
function createAllowLimiter(): ChatLimiter {
  return {
    protect: async () => ({
      isDenied: () => false,
    }),
  };
}

/** Per-user rate limits for chat API routes are disabled for now. */
export const chatPostLimiter = createAllowLimiter();

export const chatReadLimiter = createAllowLimiter();

export async function enforceChatRateLimit(
  _request: Request,
  _fingerprint: string,
  _limiter: ChatLimiter
) {
  return {
    denied: false as const,
  };
}