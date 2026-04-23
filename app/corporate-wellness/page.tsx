import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, HeartPulse, Users, Briefcase } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
const benefits = [
  {
    title: "Higher Productivity",
    description:
      "Energized employees achieve more, feel more accomplished, and enjoy the process.",
    icon: Briefcase,
  },
  {
    title: "Better Teamwork",
    description:
      "Healthy minds and bodies make collaboration smoother and more creative.",
    icon: Users,
  },
  {
    title: "Fewer Sick Days",
    description:
      "Investing in wellness means less “out of office” emails for preventable issues.",
    icon: CheckCircle2,
  },
  {
    title: "Happier Employees",
    description:
      "A workplace that cares about well-being is one people want to stick around for.",
    icon: HeartPulse,
  },
];

const workshops = [
  "Healthy Diet for Stress Management",
  "Nutrition for Energy and Focus",
  "Building Natural Immunity through Diet and Supplementation",
];

const expectations = [
  {
    title: "Engaging Formats",
    description:
      "No dull slides here. Expect lively discussions, hands-on activities, and actionable tips your team can use immediately.",
  },
  {
    title: "Tailored Content",
    description:
      "We tailor each workshop to align with your company’s culture and wellness objectives.",
  },
  {
    title: "Expert Teachers",
    description:
      "Certified professionals deliver wellness expertise with energy, clarity, and enthusiasm.",
  },
  {
    title: "Onsite or Online",
    description:
      "Whether in the office or on Zoom, we make the experience seamless and effective.",
  },
];

export default function CorporateWellnessPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8 md:py-16">
      <div className="space-y-16">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border px-3 py-1 text-sm font-medium text-muted-foreground">
              Corporate Wellness Workshops
            </span>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Wellness workshops that help your team feel better and work
                better
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Work doesn’t have to mean stress, burnout, and endless coffee
                breaks just to survive the day. Our Corporate Wellness Workshops
                are designed to help your team thrive through interactive,
                practical sessions that bring energy, focus, and positivity into
                the workplace.
              </p>
              <p className="max-w-2xl text-muted-foreground">
                No dull lectures. Just real solutions your team can actually use
                and remember.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/contact">Book Today</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/courses">Explore Courses</Link>
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border bg-muted/40 p-8 shadow-sm">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Why Wellness Workshops Work</h2>
              <p className="text-muted-foreground">
                When your team feels great, they do great. Wellness supports
                productivity, collaboration, and long-term employee satisfaction.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.title}
                    className="rounded-2xl border bg-background p-4 shadow-sm"
                  >
                    <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{benefit.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-10 py-6">
  <div className="space-y-4 text-center">
    <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7a9442]">
      Signature Sessions
    </p>
    <h2 className="text-3xl font-bold tracking-tight text-[#232742] md:text-4xl">
      Workshops your team will love
    </h2>
    <p className="mx-auto max-w-2xl text-muted-foreground">
      Practical, engaging sessions designed to improve well-being, focus,
      and performance in the workplace.
    </p>
  </div>

  <div className="mx-auto max-w-3xl">
    <Accordion type="single" collapsible className="space-y-4">
      
      <AccordionItem
        value="item-1"
        className="rounded-2xl border bg-white px-6 shadow-sm"
      >
        <AccordionTrigger className="text-left text-lg font-semibold text-[#232742]">
          Healthy Diet for Stress Management
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-7">
          Ditch the tension with proper nutritional strategies and practical
          stress relief techniques—perfect for tackling that never-ending
          to-do list.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-2"
        className="rounded-2xl border bg-white px-6 shadow-sm"
      >
        <AccordionTrigger className="text-left text-lg font-semibold text-[#232742]">
          Nutrition for Energy and Focus
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-7">
          Uncover how what you eat fuels how you feel. Learn quick tips for
          meal planning, smart snacking, and conquering the mid-afternoon
          slump.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-3"
        className="rounded-2xl border bg-white px-6 shadow-sm"
      >
        <AccordionTrigger className="text-left text-lg font-semibold text-[#232742]">
          Building Natural Immunity through Diet and Supplementation
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-7">
          Support your immune system with simple, effective nutrition and
          supplementation strategies that your team can easily apply in daily life.
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  </div>
</section>

        <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-3xl border bg-muted/30 shadow-sm">
            <div className="flex min-h-[320px] items-center justify-center p-8 text-center">
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Workshop Experience
                </p>
                <h3 className="text-2xl font-semibold">
                  A welcoming, modern, and collaborative environment
                </h3>
                <p className="mx-auto max-w-md text-muted-foreground">
                  A group of diverse adults attending a business meeting in a
                  modern conference room.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">
                What to Expect
              </h2>
              <p className="text-muted-foreground">
                Every workshop is designed to be practical, supportive, and easy
                to bring into your team’s day-to-day routine.
              </p>
            </div>

            <div className="space-y-4">
              {expectations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-background p-5 shadow-sm"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-primary/5 px-6 py-10 text-center md:px-10">
          <div className="mx-auto max-w-3xl space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Your Team Deserves This
            </h2>
            <p className="text-lg text-muted-foreground">
              When wellness is fun, it sticks. And when it sticks, your business
              thrives. Ready to invest in your team’s happiness, health, and
              success?
            </p>
            <div className="pt-2">
              <Button asChild size="lg">
                <Link href="/contact">Book Today</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6 text-center">
  <div className="space-y-3">
    <h2 className="text-3xl font-bold tracking-tight">
      Featured Video
    </h2>
    <p className="mx-auto max-w-2xl text-muted-foreground">
      Check out our channel for educational content and join a community
      focused on improving health and wellness.
    </p>
  </div>

<div className="flex justify-center">
  <video
    src="https://health-academy-lms.t3.tigrisfiles.io/Public_Speaking.mp4"
    controls
    className="w-[400px] rounded-2xl shadow-md"
  />
</div>
</section>
      </div>
    </main>
  );
}