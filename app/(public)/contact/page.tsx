import {
  ArrowRight,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { ContactForm } from "@/components/email/ContactForm";

const contactItems = [
  {
    label: "Phone",
    value: "647-568-6542",
    href: "tel:6475686542",
    icon: Phone,
  },
  {
    label: "Email",
    value: "happynutritionhealth@gmail.com",
    href: "mailto:happynutritionhealth@gmail.com",
    icon: Mail,
  },
  {
    label: "Location",
    value: "Yonge Street · Thornhill ON L3T 0C6",
    href: "https://www.google.com/maps/search/?api=1&query=Yonge%20Street%20Thornhill%20ON%20L3T%200C6",
    icon: MapPin,
  },
];

const supportHighlights = [
  {
    title: "Course Questions",
    description: "Ask about enrollment, course access, content, or learning paths.",
    icon: MessageSquare,
  },
  {
    title: "Response Time",
    description: "We review messages and reply as soon as possible.",
    icon: Clock3,
  },
  {
    title: "Helpful Guidance",
    description: "Get support related to nutrition, wellness education, and academy info.",
    icon: ShieldCheck,
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative border-b border-border/70 bg-[#f7f7f3] py-20 dark:bg-[#11130f] md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(95,127,46,0.16),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(35,39,66,0.1),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(95,127,46,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(95,127,46,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center rounded-full border border-[#5f7f2e]/20 bg-[#5f7f2e]/10 px-4 py-2 text-sm font-medium text-[#5f7f2e]">
                Contact Happy Nutrition
              </div>

              <div className="space-y-4">
                <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#232742] dark:text-white md:text-5xl lg:text-6xl">
                  We are here to help you start your wellness learning journey.
                </h1>

                <p className="max-w-2xl text-pretty text-base leading-8 text-muted-foreground md:text-lg">
                  Have questions about our courses, enrollment, natural health
                  education, or support? Send us a message and our team will get
                  back to you.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl">
              <div className="grid gap-3">
                {supportHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="flex gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e]">
                        <Icon className="size-5" />
                      </div>

                      <div>
                        <h2 className="text-sm font-semibold">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="absolute left-0 top-28 -z-10 h-80 w-80 rounded-full bg-[#5f7f2e]/10 blur-3xl" />
        <div className="absolute bottom-20 right-0 -z-10 h-80 w-80 rounded-full bg-[#232742]/10 blur-3xl dark:bg-white/10" />

        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-16">
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl shadow-black/5 md:p-8">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  You can also find us at
                </h2>

                <p className="text-sm leading-7 text-muted-foreground">
                  Reach out directly using the contact details below. We are
                  happy to help with questions about courses and support.
                </p>
              </div>

              <div className="mt-7 space-y-3">
                {contactItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.label === "Location" ? "_blank" : undefined}
                      rel={
                        item.label === "Location"
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#5f7f2e]/30 hover:shadow-md"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e] transition group-hover:scale-105">
                        <Icon className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium">
                          {item.value}
                        </p>
                      </div>

                      <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[#5f7f2e]" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-[#232742] p-6 text-white shadow-xl shadow-black/10 md:p-8">
              <div className="absolute" />
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/50">
                  Natural Health Academy
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Learn with confidence.
                </h3>
                <p className="text-sm leading-7 text-white/70">
                  Our courses are designed to make holistic health education
                  practical, accessible, and easy to apply.
                </p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}