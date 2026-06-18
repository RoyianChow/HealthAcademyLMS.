/**
 * In Next.js, redirect() throws a special error.  Broad try/catch blocks in
 * server actions must rethrow it so auth gates (requireUser / requireAdmin)
 * still redirect the client.
 */
export function rethrowIfNextRedirect(error: unknown): void {
  if (error instanceof Error && error.message === "NEXT_REDIRECT") {
    throw error;
  }
}
