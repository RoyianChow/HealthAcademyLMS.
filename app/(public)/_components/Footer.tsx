import Link from "next/link";

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Courses", href: "/courses" },
  { label: "Contact Us", href: "/contact" },
  { label: "Legal Disclaimer", href: "/legal" },
];

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/70 bg-[#f7f7f3] text-foreground dark:bg-[#11130f]">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 lg:px-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:items-start">
          <div className="max-w-md space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#5f7f2e] text-lg font-bold text-white shadow-lg shadow-[#5f7f2e]/20">
                HN
              </div>

              <div>
                <p className="text-base font-semibold tracking-tight">
                  Happy Nutrition
                </p>
                <p className="text-sm text-muted-foreground">
                  Natural Health Academy
                </p>
              </div>
            </Link>

            <p className="text-sm leading-7 text-muted-foreground">
              Evidence-based nutrition and holistic health education designed
              to help learners build practical, confident wellness knowledge.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Explore
            </h3>

            <nav className="flex flex-col gap-3 text-sm">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="w-fit text-muted-foreground transition-colors hover:text-[#5f7f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f7f2e]/40"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Connect
            </h3>

            <p className="text-sm leading-7 text-muted-foreground">
              Follow us for wellness education, course updates, and natural
              health insights.
            </p>

            <a
              href="https://instagram.com/happynutritionhealth/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Happy Nutrition on Instagram"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-[#5f7f2e]/40 hover:bg-[#5f7f2e]/10 hover:text-[#5f7f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f7f2e]/40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-border/70 pt-6">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Happy Nutrition LTD. All rights reserved.</p>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href="/legal"
                className="transition-colors hover:text-[#5f7f2e]"
              >
                Legal
              </Link>

              <Link
                href="/contact"
                className="transition-colors hover:text-[#5f7f2e]"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}