import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CountUp } from "./_components/count-up";

const stats = [
  { value: 50, label: "GLOBAL LEARNERS" },
  { value: 1000, label: "HOURS OF INSTRUCTION" },
  { value: 5, label: "TRANSFORMATIONAL PROGRAMS" },
];
export default function Home() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="relative h-[80vh] w-full overflow-hidden">
        {/* Background Image */}
        <img
          src="/hero-photo.png"
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Light overlay */}
        <div className="absolute inset-0 bg-white/40" />

        {/* Content */}
        <div className="relative z-10 flex h-full items-center">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl space-y-6">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Advanced Nutrition <br />
                &amp; Holistic Health <br />
                Courses
              </h1>

              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-[#5f7f2e] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#4f6a25]"
              >
                GET STARTED →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3 lg:px-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center text-center"
            >
<p className="text-4xl font-bold tracking-tight">
  <CountUp end={stat.value} suffix="+" />
</p>              <p className="mt-2 text-sm font-medium tracking-[0.2em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border bg-card p-4 shadow-sm">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              <video
                className="h-full w-full object-cover"
                controls
                poster="/placeholder-about.jpg"
              >
                <source src="/sample-video.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          <div className="space-y-6">
            <Badge variant="outline">About Us</Badge>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome to the Natural Health Academy
            </h2>

            <p className="text-lg leading-8 text-muted-foreground">
              Welcome to the Natural Health Academy, where we’re passionate
              about empowering individuals with the knowledge and skills to take
              charge of their health through natural, evidence-based approaches.
            </p>

            <p className="text-lg leading-8 text-muted-foreground">
              Our mission is to make holistic health knowledge accessible,
              practical, and transformative. Our academy provides comprehensive
              education, resources, and support to guide our students toward
              holistic wellness, blending ancient traditions with modern
              insights to foster sustainable health solutions.
            </p>

            <Link
              href="/about"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              Read our Story
            </Link>
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 space-y-4">
            <Badge variant="outline">Our Courses</Badge>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Our Courses
            </h2>

            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              We offer a variety of informative courses ranging from the
              practical use of natural supplements to teaching you to optimize
              mental well-being through personalized, functional nutrition
              strategies.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Card className="overflow-hidden py-0">
              <div className="aspect-[16/10] bg-muted" />
              <CardContent className="space-y-3 p-6">
                <h3 className="text-xl font-semibold">
                  Functional Nutrition For Cancer Risk Reduction
                </h3>
                <p className="text-muted-foreground">
                  Build a foundational understanding of why nutrition and
                  lifestyle matter in cancer risk reduction and support.
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-0">
              <div className="aspect-[16/10] bg-muted" />
              <CardContent className="space-y-3 p-6">
                <h3 className="text-xl font-semibold">
                  Functional Nutrition For Mental Health
                </h3>
                <p className="text-muted-foreground">
                  A practitioner-led course teaching you to optimize mental
                  well-being through personalized, functional nutrition
                  strategies.
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-0">
              <div className="aspect-[16/10] bg-muted" />
              <CardContent className="space-y-3 p-6">
                <h3 className="text-xl font-semibold">
                  Natural Supplement Advisor
                </h3>
                <p className="text-muted-foreground">
                  A comprehensive course teaching the science and practical use
                  of natural supplements for safe, personalized health
                  optimization.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Link
              href="/courses"
              className={buttonVariants({
                size: "lg",
              })}
            >
              View All Courses
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}