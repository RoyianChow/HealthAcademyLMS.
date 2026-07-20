import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Leaf,
  PlayCircle,
  Quote,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "./_components/count-up";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Advanced Nutrition & Holistic Health Courses",
  description:
    "Empower your wellness journey with evidence-based nutrition and holistic health education from the Natural Health Academy.",
  path: "/",
});

const stats = [
  {
    value: 50,
    label: "Global Learners",
    helper: "Students building practical wellness knowledge",
    icon: UsersRound,
  },
  {
    value: 1000,
    label: "Hours of Instruction",
    helper: "In-depth lessons, tools, and guided learning",
    icon: Clock3,
  },
  {
    value: 5,
    label: "Transformational Programs",
    helper: "Focused courses for natural health growth",
    icon: GraduationCap,
  },
];

const courses = [
  {
    title: "Functional Nutrition For Cancer Risk Reduction",
    tag: "Prevention Focus",
    description:
      "Build a strong foundation in how nutrition and lifestyle choices can support long-term wellness and reduce cancer risk.",
  },
  {
    title: "Functional Nutrition For Mental Health",
    tag: "Mind & Mood",
    description:
      "Learn practical, practitioner-led strategies to support mood, focus, and emotional well-being through nutrition.",
  },
  {
    title: "Natural Supplement Advisor",
    tag: "Supplement Safety",
    description:
      "Understand the science, safety, and practical application of natural supplements for personalized health support.",
  },
];

const features = [
  "Evidence-based natural health education",
  "Flexible online learning experience",
  "Practical tools for real-world wellness",
];

const testimonials = [
  {
    name: "Lyudmyla Yusipenko",
    role: "Student",
    quote:
      "The Natural Health Academy is truly a gem for anyone eager to deepen their understanding of holistic wellness. Olga is very passionate about teaching the students about the root causes of illnesses and exploring various natural health strategies to address those issues. Her knowledge of Natural Medicines is amazing! The Academy has empowered me to take control of my well-being with confidence. I know which foods are good for me and am no longer lost when I walk into a Health Store.",
  },
  {
    name: "Egle Baceniene",
    role: "Student",
    quote:
      "I've taken several courses at the Natural Health Academy, and they have exceeded my expectations every time. The depth of science-backed information is impressive, providing a solid foundation for anyone looking to enhance their health naturally. The classes are interactive, making learning both engaging and practical. I also loved being part of a community of like-minded individuals who are just as passionate about wellness. The instructor's enthusiasm and deep knowledge made every session enjoyable and informative. Now, I feel confident in selecting the right supplements for my needs and addressing health concerns with natural strategies.",
  },
  {
    name: "Sara Shpeyer",
    role: "Student",
    quote:
      "I signed up for a course at the Health Academy expecting to gain some useful tips on how to eat better, but I got so much more! I learned how to detox my home and kitchen, why certain nutrients are important for certain organs in the body, how to identify nutritional deficiencies, and how to take supplements correctly!",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <Image
          src="/hero-photo.png"
          alt="Advanced Nutrition and Holistic Health Courses"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/60 to-black/25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(95,127,46,0.35),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.13),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-7xl items-center px-6 py-24 md:px-10 lg:px-16">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-3xl space-y-8">
              <Badge className="w-fit rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-white shadow-sm backdrop-blur-md hover:bg-white/10">
                <Sparkles className="mr-2 size-3.5" />
                Premium Holistic Education
              </Badge>

              <div className="space-y-5">
                <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                  Advanced Nutrition &amp; Holistic Health Courses
                </h1>

                <p className="max-w-2xl text-pretty text-base leading-8 text-white/85 sm:text-lg">
                  Professional, evidence-based education designed to help you
                  build confidence in natural health, functional nutrition, and
                  sustainable wellness practices.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/courses"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#5f7f2e] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(95,127,46,0.35)] transition hover:-translate-y-0.5 hover:bg-[#4f6a25] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  Explore Courses
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  Learn More
                  <PlayCircle className="size-4" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#b9d98b]" />
                  Evidence-based
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#b9d98b]" />
                  Online learning
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#b9d98b]" />
                  Practical guidance
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-6">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white/70">
                        Featured learning path
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                        Functional Wellness Foundations
                      </h2>
                    </div>

                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#5f7f2e] text-white shadow-lg">
                      <Leaf className="size-6" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white/85"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-[#b9d98b]" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-2xl bg-white p-5 text-[#232742] shadow-xl dark:bg-white/95">
                    <div className="flex items-center gap-1 text-[#5f7f2e]">
                      {[...Array(5)].map((_, index) => (
                        <Star key={index} className="size-4 fill-current" />
                      ))}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#232742]/80">
                      Learn how nutrition, lifestyle, and natural wellness
                      strategies can support real-world health goals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-16 px-6 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] border border-border/70 bg-background/90 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl md:grid-cols-3 md:p-5">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="group rounded-[1.5rem] border bg-card p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e] transition group-hover:scale-105">
                  <Icon className="size-6" />
                </div>

                <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                  <CountUp end={stat.value} suffix="+" />
                </p>

                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">
                  {stat.label}
                </p>

                <p className="mx-auto mt-3 max-w-56 text-sm leading-6 text-muted-foreground">
                  {stat.helper}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative py-24 md:py-28">
        <div className="absolute left-0 top-20 -z-10 h-72 w-72 rounded-full bg-[#5f7f2e]/10 blur-3xl" />
        <div className="absolute right-0 bottom-20 -z-10 h-72 w-72 rounded-full bg-[#232742]/10 blur-3xl dark:bg-white/10" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 md:px-10 lg:grid-cols-2 lg:px-16">
          <div className="group overflow-hidden rounded-[2rem] border bg-card p-3 shadow-2xl shadow-black/10">
            <div className="overflow-hidden rounded-[1.5rem]">
              <video
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black object-contain"
              >
                <source
                  src="https://health-academy-lms.t3.tigrisfiles.io/FINAL-1.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="max-w-2xl space-y-7">
            <Badge variant="outline" className="w-fit rounded-full px-4 py-1.5">
              About Us
            </Badge>

            <div className="space-y-4">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Welcome to the Natural Health Academy
              </h2>

              <p className="text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
                We are passionate about empowering individuals with the
                knowledge and skills to take charge of their health through
                natural, evidence-based approaches.
              </p>

              <p className="text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
                Our mission is to make holistic health education accessible,
                practical, and transformative. We blend traditional wisdom with
                modern insight to help students build sustainable, informed
                approaches to wellness.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5f7f2e]/10 text-[#5f7f2e]">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {feature}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "rounded-full px-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              })}
            >
              Read Our Story
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge variant="outline" className="w-fit rounded-full px-4 py-1.5">
                Our Courses
              </Badge>

              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Learn Through Practical, Transformative Programs
              </h2>

              <p className="text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
                Explore a curated range of courses designed to help you apply
                functional nutrition and holistic wellness principles with
                confidence in real-world settings.
              </p>
            </div>

            <Link
              href="/courses"
              className={buttonVariants({
                size: "lg",
                className:
                  "rounded-full bg-[#5f7f2e] px-6 text-white shadow-lg shadow-[#5f7f2e]/20 transition hover:-translate-y-0.5 hover:bg-[#4f6a25]",
              })}
            >
              View All Courses
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {courses.map((course) => (
              <Card
                key={course.title}
                className="group relative overflow-hidden rounded-[2rem] border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#5f7f2e] via-[#95b861] to-[#5f7f2e]" />

                <CardContent className="flex h-full flex-col space-y-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e] transition group-hover:scale-105">
                      <BookOpen className="size-6" />
                    </div>

                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 text-[11px]"
                    >
                      {course.tag}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {course.title}
                    </h3>

                    <p className="text-sm leading-7 text-muted-foreground">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-2">
                    <Link
                      href="/courses"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f7f2e] transition group-hover:gap-3"
                    >
                      Learn more
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-muted/40 py-24 md:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(95,127,46,0.12),transparent_30%)]" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="mb-12 max-w-3xl space-y-4">
            <Badge
              variant="outline"
              className="w-fit rounded-full bg-background px-4 py-1.5"
            >
              Testimonials
            </Badge>

            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              What Our Students Say
            </h2>

            <p className="text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
              Hear from learners who have transformed their approach to health
              through the Natural Health Academy.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="group rounded-[2rem] border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <CardContent className="flex h-full flex-col gap-6 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#5f7f2e]">
                      {[...Array(5)].map((_, index) => (
                        <Star key={index} className="size-4 fill-current" />
                      ))}
                    </div>

                    <Quote className="size-8 text-[#5f7f2e]/20 transition group-hover:text-[#5f7f2e]/40" />
                  </div>

                  <p className="flex-1 text-sm leading-7 text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>

                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border bg-[#232742] shadow-2xl shadow-black/10">
          <div className="relative px-6 py-14 text-center md:px-10 md:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(95,127,46,0.45),transparent_32%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.13),transparent_28%)]" />

            <div className="relative mx-auto max-w-3xl space-y-6">
              <Badge className="rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-white hover:bg-white/10">
                Start Learning Today
              </Badge>

              <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Build practical wellness knowledge with expert-led education
              </h2>

              <p className="text-pretty text-base leading-8 text-white/75 sm:text-lg">
                Whether you are starting your personal wellness journey or
                expanding your professional knowledge, our programs are designed
                to support your growth.
              </p>

              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#232742] shadow-xl transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                Browse Courses
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}