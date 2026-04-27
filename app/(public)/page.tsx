import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "./_components/count-up";

const stats = [
  { value: 50, label: "Global Learners" },
  { value: 1000, label: "Hours of Instruction" },
  { value: 5, label: "Transformational Programs" },
];

const courses = [
  {
    title: "Functional Nutrition For Cancer Risk Reduction",
    description:
      "Build a strong foundation in how nutrition and lifestyle choices can support long-term wellness and reduce cancer risk.",
  },
  {
    title: "Functional Nutrition For Mental Health",
    description:
      "Learn practical, practitioner-led strategies to support mood, focus, and emotional well-being through nutrition.",
  },
  {
    title: "Natural Supplement Advisor",
    description:
      "Understand the science, safety, and practical application of natural supplements for personalized health support.",
  },
];

const features = [
  "Evidence-based natural health education",
  "Flexible online learning experience",
  "Practical tools for real-world wellness",
];

export default function Home() {
  return (
    <main className="w-full bg-background text-foreground">
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <Image
          src="/hero-photo.png"
          alt="Advanced Nutrition and Holistic Health Courses"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />

        <div className="relative z-10 flex min-h-[92vh] items-center">
          <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10 lg:px-16">
            <div className="max-w-3xl space-y-8">
              <Badge className="rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-white backdrop-blur-sm hover:bg-white/10">
                Premium Holistic Education
              </Badge>

              <div className="space-y-5">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                  Advanced Nutrition &amp; Holistic Health Courses
                </h1>

                <p className="max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
                  Professional, evidence-based education designed to help you
                  build confidence in natural health, functional nutrition, and
                  sustainable wellness practices.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5f7f2e] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#4f6a25]"
                >
                  Explore Courses
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  Learn More
                  <PlayCircle className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-16 px-6 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-3xl border bg-background/95 p-6 shadow-2xl backdrop-blur md:grid-cols-3 md:p-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border bg-muted/30 px-4 py-8 text-center"
            >
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                <CountUp end={stat.value} suffix="+" />
              </p>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 md:px-10 lg:grid-cols-2 lg:px-16">
          <div className="overflow-hidden rounded-[2rem] border bg-card p-3 shadow-xl">
            <video
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-[1.5rem] bg-black object-cover"
            >
              <source
                src="https://health-academy-lms.t3.tigrisfiles.io/FINAL-1.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="max-w-2xl space-y-6">
            <Badge variant="outline" className="rounded-full px-4 py-1.5">
              About Us
            </Badge>

            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Welcome to the Natural Health Academy
              </h2>

              <p className="text-base leading-8 text-muted-foreground sm:text-lg">
                We are passionate about empowering individuals with the
                knowledge and skills to take charge of their health through
                natural, evidence-based approaches.
              </p>

              <p className="text-base leading-8 text-muted-foreground sm:text-lg">
                Our mission is to make holistic health education accessible,
                practical, and transformative. We blend traditional wisdom with
                modern insight to help students build sustainable, informed
                approaches to wellness.
              </p>
            </div>

            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-[#5f7f2e]" />
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
                className: "rounded-full px-6 shadow-sm transition hover:shadow-md",
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
              <Badge variant="outline" className="rounded-full px-4 py-1.5">
                Our Courses
              </Badge>

              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Learn Through Practical, Transformative Programs
              </h2>

              <p className="text-base leading-8 text-muted-foreground sm:text-lg">
                Explore a curated range of courses designed to help you apply
                functional nutrition and holistic wellness principles with
                confidence in real-world settings.
              </p>
            </div>

            <Link
              href="/courses"
              className={buttonVariants({
                size: "lg",
                className: "rounded-full px-6",
              })}
            >
              View All Courses
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {courses.map((course) => (
              <Card
                key={course.title}
                className="group overflow-hidden rounded-3xl border bg-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e]">
                    <BookOpen className="size-6" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {course.title}
                    </h3>

                    <p className="text-sm leading-7 text-muted-foreground">
                      {course.description}
                    </p>
                  </div>

                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f7f2e] transition group-hover:gap-3"
                  >
                    Learn more
                    <ArrowRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border bg-[#f7f7f3] px-6 py-12 text-center shadow-sm md:px-10">
          <div className="mx-auto max-w-3xl space-y-5">
            <Badge variant="outline" className="rounded-full bg-background px-4 py-1.5">
              Start Learning Today
            </Badge>

            <h2 className="text-3xl font-semibold tracking-tight text-[#232742] sm:text-4xl">
              Build practical wellness knowledge with expert-led education
            </h2>

            <p className="text-base leading-8 text-muted-foreground sm:text-lg">
              Whether you are starting your personal wellness journey or
              expanding your professional knowledge, our programs are designed
              to support your growth.
            </p>

            <Link
              href="/courses"
              className={buttonVariants({
                size: "lg",
                className: "rounded-full px-8",
              })}
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}