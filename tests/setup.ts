import { vi } from "vitest";

/**
 * Prevent the "server-only" marker package from throwing outside of a real
 * Next.js server context.  All server-side modules that import it will receive
 * an empty module instead.
 */
vi.mock("server-only", () => ({}));

/**
 * In Next.js, redirect() stops execution by throwing a special NEXT_REDIRECT
 * error.  We replicate that behaviour so tests can assert on it with
 * `await expect(...).rejects.toThrow("NEXT_REDIRECT")`.
 */
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    (error as NodeJS.ErrnoException & { digest?: string }).digest =
      `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

/**
 * next/headers is only available inside a running Next.js request context.
 * Return a plain empty Headers object in tests.
 */
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

/**
 * next/cache revalidation functions are no-ops in tests; we only care that
 * they are (or are not) called, not that they actually invalidate anything.
 */
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

/**
 * React.cache() memoises the wrapped function per render tree.
 * Disable it in tests so that each call to requireAdmin() re-executes the
 * real async function, allowing us to change the mocked session between cases.
 */
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: (fn: unknown) => fn };
});
