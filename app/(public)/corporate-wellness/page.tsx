import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  Laptop,
  Leaf,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const benefits = [
  {
    title: "Higher Productivity",
    description:
      "Energized employees achieve more, feel more accomplished, and stay focused longer.",
    icon: Briefcase,
  },
  {
    title: "Better Teamwork",
    description:
      "Healthy minds and bodies make collaboration smoother, more positive, and more creative.",
    icon: Users,
  },
  {
    title: "Fewer Sick Days",
    description:
      "Investing in wellness can support healthier habits and reduce preventable time away.",
    icon: ShieldCheck,
  },
  {
    title: "Happier Employees",
    description:
      "A workplace that cares about well-being is one people feel proud to be part of.",
    icon: HeartPulse,
  },
];

const workshops = [
  {
    title: "Healthy Diet for Stress Management",
    description:
      "Ditch the tension with proper nutritional strategies and practical stress relief techniques, perfect for tackling that never-ending to-do list.",
  },
  {
    title: "Nutrition for Energy and Focus",
    description:
      "Uncover how what you eat fuels how you feel. Learn quick tips for meal planning, smart snacking, and conquering the mid-afternoon slump.",
  },
  {
    title: "Building Natural Immunity through Diet and Supplementation",
    description:
      "Support your immune system with simple, effective nutrition and supplementation strategies that your team can easily apply in daily life.",
  },
];

const expectations = [
  {
    title: "Engaging Formats",
    description:
      "No dull slides here. Expect lively discussions, hands-on activities, and practical tips your team can use immediately.",
    icon: Sparkles,
  },
  {
    title: "Tailored Content",
    description:
      "Each workshop can be shaped around your company culture, employee needs, and wellness objectives.",
    icon: BadgeCheck,
  },
  {
    title: "Expert Teachers",
    description:
      "Certified professionals deliver wellness expertise with energy, clarity, and enthusiasm.",
    icon: Leaf,
  },
  {
    title: "Onsite or Online",
    description:
      "Whether in the office or on Zoom, we make the workshop experience seamless and effective.",
    icon: Laptop,
  },
];

const stats = [
  {
    value: "60–90 min",
    label: "Workshop length",
  },
  {
    value: "Online / Onsite",
    label: "Flexible delivery",
  },
  {
    value: "Practical",
    label: "Action-focused learning",
  },
];

export default function CorporateWellnessPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative border-b border-border/70 bg-[#f7f7f3] py-20 dark:bg-[#11130f] md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(95,127,46,0.18),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(35,39,66,0.12),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(95,127,46,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(95,127,46,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-16">
          <div className="max-w-3xl space-y-8">
            <Badge className="w-fit rounded-full border-[#5f7f2e]/20 bg-[#5f7f2e]/10 px-4 py-1.5 text-[#5f7f2e] hover:bg-[#5f7f2e]/10">
              <Sparkles className="mr-2 size-3.5" />
              Corporate Wellness Workshops
            </Badge>

            <div className="space-y-5">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#232742] dark:text-white sm:text-5xl lg:text-6xl">
                Wellness workshops that help your team feel better and work
                better
              </h1>

              <p className="max-w-2xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
                Work does not have to mean stress, burnout, and endless coffee
                breaks just to survive the day. Our workshops help teams build
                healthier habits through practical, interactive sessions.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[#5f7f2e] px-7 text-white shadow-lg shadow-[#5f7f2e]/20 transition hover:-translate-y-0.5 hover:bg-[#4f6a25]"
              >
                <Link href="/contact">
                  Book Today
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href="/courses">Explore Courses</Link>
              </Button>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur"
                >
                  <p className="text-lg font-semibold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#232742] p-6 text-white">
              <div className="absolute" />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/60">
                    Why it works
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Wellness that fits into real work life
                  </h2>
                </div>

                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#5f7f2e] text-white shadow-lg">
                  <Zap className="size-6" />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/70">
                When your team feels great, they do great. These workshops are
                built to support productivity, focus, collaboration, and
                long-term employee satisfaction.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15"
                    >
                      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#b9d98b]">
                        <Icon className="size-5" />
                      </div>

                      <h3 className="text-sm font-semibold">
                        {benefit.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/65">
                        {benefit.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 md:py-24">
        <div className="absolute left-0 top-20 -z-10 h-80 w-80 rounded-full bg-[#5f7f2e]/10 blur-3xl" />
        <div className="absolute bottom-20 right-0 -z-10 h-80 w-80 rounded-full bg-[#232742]/10 blur-3xl dark:bg-white/10" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-4 rounded-full px-4 py-1.5"
            >
              Signature Sessions
            </Badge>

            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Workshops your team will actually enjoy
            </h2>

            <p className="mt-4 text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
              Practical, engaging sessions designed to improve well-being,
              focus, and performance in the workplace.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <Accordion type="single" collapsible className="space-y-4">
              {workshops.map((workshop, index) => (
                <AccordionItem
                  key={workshop.title}
                  value={`item-${index + 1}`}
                  className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card px-6 shadow-sm transition hover:shadow-md"
                >
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline md:text-lg">
                    <span className="flex items-center gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5f7f2e]/10 text-sm font-semibold text-[#5f7f2e]">
                        {index + 1}
                      </span>
                      {workshop.title}
                    </span>
                  </AccordionTrigger>

                  <AccordionContent className="pb-6 pl-0 leading-7 text-muted-foreground md:pl-[52px]">
                    {workshop.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f3] py-20 dark:bg-[#11130f] md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:px-10 lg:grid-cols-[1fr_0.95fr] lg:px-16">
          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-background p-4 shadow-xl shadow-black/5">
            <div className="space-y-5 p-2 md:p-4">
              <div className="space-y-3">
                <Badge
                  variant="outline"
                  className="rounded-full px-4 py-1.5"
                >
                  Featured Video
                </Badge>

                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Educational content for healthier teams
                </h2>

                <p className="text-base leading-7 text-muted-foreground">
                  Check out our channel for educational content and join a
                  community focused on the betterment of your health.
                </p>
              </div>

              <div className="aspect-video overflow-hidden rounded-[1.5rem] border bg-black shadow-lg">
                <iframe
                  src="https://www.youtube.com/embed/pUpcsd7ksg4"
                  title="Health Academy featured video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <Badge variant="outline" className="rounded-full px-4 py-1.5">
                What to Expect
              </Badge>

              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Practical support from start to finish
              </h2>

              <p className="text-base leading-8 text-muted-foreground">
                Every workshop is designed to be practical, supportive, and easy
                to bring into your team&apos;s day-to-day routine.
              </p>
            </div>

            <div className="grid gap-4">
              {expectations.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="group rounded-[1.5rem] border border-border/70 bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e] transition group-hover:scale-105">
                        <Icon className="size-5" />
                      </div>

                      <div>
                        <h3 className="font-semibold tracking-tight">
                          {item.title}
                        </h3>

                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 md:py-24 lg:px-16">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border bg-[#232742] shadow-2xl shadow-black/10">
          <div className="relative px-6 py-14 text-center md:px-10 md:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(95,127,46,0.45),transparent_32%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.13),transparent_28%)]" />

            <div className="relative mx-auto max-w-3xl space-y-6">
              <Badge className="rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-white hover:bg-white/10">
                <CalendarCheck className="mr-2 size-3.5" />
                Book a Workshop
              </Badge>

              <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Your team deserves wellness that is useful, engaging, and easy
                to apply.
              </h2>

              <p className="text-pretty text-base leading-8 text-white/75 sm:text-lg">
                When wellness is fun, it sticks. And when it sticks, your
                business thrives. Ready to invest in your team&apos;s happiness,
                health, and success?
              </p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-white px-8 text-[#232742] shadow-xl transition hover:-translate-y-0.5 hover:bg-white/90"
                >
                  <Link href="/contact">
                    Book Today
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/25 bg-white/10 px-8 text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 hover:text-white"
                >
                  <Link href="/courses">
                    Explore Courses
                    <PlayCircle className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}