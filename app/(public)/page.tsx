import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "./_components/count-up";

const stats = [
  { value: 50, label: "GLOBAL LEARNERS" },
  { value: 1000, label: "HOURS OF INSTRUCTION" },
  { value: 5, label: "TRANSFORMATIONAL PROGRAMS" },
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

export default function Home() {
  return (
    <div className="w-full bg-background text-foreground">
      {/* HERO SECTION */}
      <section className="relative min-h-[92vh] w-full overflow-hidden">
        <Image
          src="/hero-photo.png"
          alt="Advanced Nutrition and Holistic Health Courses"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 flex min-h-[92vh] w-full items-center">
          <div className="w-full px-6 py-20 md:px-10 lg:px-16 xl:px-24">
            <div className="max-w-3xl space-y-8">
              <Badge className="rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-white backdrop-blur-sm hover:bg-white/10">
                Premium Holistic Education
              </Badge>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                  Advanced Nutrition
                  <br />
                  &amp; Holistic Health
                  <br />
                  Courses
                </h1>

                <p className="max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
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
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  Learn More
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-20 -mt-16 px-6 md:px-10 lg:px-16 xl:px-24">
        <div className="grid gap-4 rounded-3xl border border-border/60 bg-background/95 p-6 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80 md:grid-cols-3 md:p-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-muted/30 px-4 py-8 text-center"
            >
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                <CountUp end={stat.value} suffix="+" />
              </p>
              <p className="mt-3 text-xs font-semibold tracking-[0.28em] text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-24 md:py-28">
  <div className="grid items-center gap-14 px-6 md:px-10 lg:grid-cols-2 lg:px-16 xl:px-24">
    <div className="relative flex min-h-[560px] items-center rounded-[2rem] border border-border/60 bg-card p-6 shadow-xl md:p-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-xl">
        <video
          controls
          playsInline
          className="block w-full h-full rounded-[2rem]"
        >
          <source
            src="https://health-academy-lms.t3.tigrisfiles.io/FINAL-1.mp4"
            type="video/mp4"
          />
        </video>
      </div>
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
          We are passionate about empowering individuals with the knowledge and
          skills to take charge of their health through natural, evidence-based
          approaches.
        </p>

        <p className="text-base leading-8 text-muted-foreground sm:text-lg">
          Our mission is to make holistic health education accessible,
          practical, and transformative. We blend traditional wisdom with
          modern insight to help students build sustainable, informed
          approaches to wellness.
        </p>
      </div>

      <Link
        href="/about"
        className={buttonVariants({
          variant: "outline",
          size: "lg",
          className:
            "rounded-full px-6 shadow-sm transition hover:shadow-md",
        })}
      >
        Read Our Story
      </Link>
    </div>
  </div>
</section>

      {/* COURSES */}
      <section className="pb-24 md:pb-28">
        <div className="px-6 md:px-10 lg:px-16 xl:px-24">
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

          
        </div>
      </section>
    </div>
  );
}