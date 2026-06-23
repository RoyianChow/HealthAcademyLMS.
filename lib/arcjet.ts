import "server-only";

type ArcjetRule = Record<string, unknown>;

export type ArcjetDecision = {
  isAllowed: () => boolean;
  isDenied: () => boolean;
  isErrored: () => boolean;
  reason: {
    isRateLimit: () => boolean;
    isBot: () => boolean;
    isEmail: () => boolean;
    isShield: () => boolean;
    isSensitiveInfo: () => boolean;
    emailTypes: string[];
  };
  results: unknown[];
};

const allowDecision: ArcjetDecision = {
  isAllowed: () => true,
  isDenied: () => false,
  isErrored: () => false,
  reason: {
    isRateLimit: () => false,
    isBot: () => false,
    isEmail: () => false,
    isShield: () => false,
    isSensitiveInfo: () => false,
    emailTypes: [],
  },
  results: [],
};

const arcjet = {
  withRule: (_rule: ArcjetRule) => arcjet,
  protect: async (): Promise<ArcjetDecision> => allowDecision,
};

export async function request() {
  return undefined;
}

export function detectBot(_options?: unknown): ArcjetRule {
  return {};
}

export function fixedWindow(_options?: unknown): ArcjetRule {
  return {};
}

export function protectSignup(_options?: unknown): ArcjetRule {
  return {};
}

export function sensitiveInfo(_options?: unknown): ArcjetRule {
  return {};
}

export function shield(_options?: unknown): ArcjetRule {
  return {};
}

export function slidingWindow(_options?: unknown): ArcjetRule {
  return {};
}

export default arcjet;