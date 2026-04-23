import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 space-y-16">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl space-y-6 text-center py-8 md:py-12">
  <div className="space-y-4">
    <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7a9442]">
      Natural Health Academy
    </p>

    <h1 className="text-4xl font-bold tracking-tight text-[#232742] md:text-5xl lg:text-6xl">
      Advanced Nutrition & Holistic Health Courses
    </h1>
  </div>

  <div className="mx-auto h-[2px] w-20 bg-[#7a9442]" />

  <div className="mx-auto max-w-3xl space-y-4">
    <p className="text-lg leading-8 text-muted-foreground md:text-xl">
      Welcome to the Natural Health Academy by Happy Nutrition LTD, where we
      empower individuals with the knowledge, tools, and confidence to take
      charge of their health through natural, evidence-based approaches.
    </p>

    <p className="text-base leading-8 text-muted-foreground md:text-lg">
      Our academy provides comprehensive education, practical resources, and
      ongoing support to guide students toward holistic wellness, blending
      timeless traditions with modern insight to create sustainable health
      solutions.
    </p>
  </div>
</section>

      {/* Instructors */}
      <section className="space-y-8">
        <h2 className="text-3xl font-semibold text-center">
          Our Instructors
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
  <Card className="overflow-hidden">
    <div className="relative h-122 w-full">
      <Image
        src="https://health-academy-lms.t3.tigrisfiles.io/pinterest-profile-Olga-1.jpg"
        alt="Olga Grass"
        fill
        className="object-cover"
      />
    </div>
    <CardHeader>
      <CardTitle>Olga Grass</CardTitle>
      <p className="text-sm text-muted-foreground">Founder</p>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Olga Grass is a Certified Nutritional Practitioner, Registered
        Nutritional Therapist, and Holistic Health Coach dedicated to
        empowering clients through personalized nutrition and holistic
        wellness strategies. With a focus on sustainable, whole-food-based
        approaches, she helps individuals achieve lasting lifestyle
        changes.
      </p>
    </CardContent>
  </Card>

  <Card className="overflow-hidden">
    <div className="relative h-122 w-full">
      <Image
        src="https://health-academy-lms.t3.tigrisfiles.io/pinterest-profile-Alex.jpg"
        alt="Alex Kostikov"
        fill
        className="object-cover"
      />
    </div>
    <CardHeader>
      <CardTitle>Alex Kostikov</CardTitle>
      <p className="text-sm text-muted-foreground">Founder</p>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Alex Kostikov is a European-trained Medical Doctor, independent
        researcher with over 25 years of experience, and dedicated
        health educator. He combines medical expertise and research to
        empower individuals to make informed health decisions and
        embrace proactive wellness.
      </p>
    </CardContent>
  </Card>
</div>
      </section>

      {/* Mission */}
      <section className="border-y bg-[#f7f7f3]">
  <div className="mx-auto grid max-w-7xl md:grid-cols-3">
    <div className="relative border-b px-8 py-20 md:border-b-0 md:border-r md:px-10 lg:px-12">
      <span className="pointer-events-none absolute left-8 top-6 text-[110px] font-bold leading-none tracking-tight text-[#93ad52]/70 md:text-[130px]">
        01
      </span>

      <div className="relative mt-28 max-w-sm space-y-5">
        <h2 className="text-4xl font-semibold tracking-tight text-black">
          Our Mission
        </h2>
        <p className="text-lg leading-9 text-neutral-700">
          To make holistic health knowledge accessible, practical, and
          transformative. We believe that everyone deserves to feel empowered
          in their wellness journey. Our courses are designed to nurture
          personal and professional growth, equipping our students with the
          tools they need to live balanced lives and inspire others.
        </p>
      </div>
    </div>

    <div className="relative border-b px-8 py-20 md:border-b-0 md:border-r md:px-10 lg:px-12">

      <span className="pointer-events-none absolute left-8 top-6 text-[110px] font-bold leading-none tracking-tight text-[#93ad52]/70 md:text-[130px]">
        02
      </span>

      <div className="relative mt-28 max-w-sm space-y-5">
        <h2 className="text-4xl font-semibold tracking-tight text-black">
          Why Choose Us
        </h2>
        <p className="text-lg leading-9 text-neutral-700">
          Our educators are leaders in their fields, with a wealth of
          experience in both academic and clinical settings. With interactive
          online courses, hands-on workshops, and supportive community
          resources, we’re dedicated to creating a learning environment that’s
          as enriching as it is accessible. Becoming a part of the Natural
          Health Academy means joining a vibrant, supportive community of
          health enthusiasts, practitioners, and lifelong learners.
        </p>
      </div>
    </div>

    <div className="relative px-8 py-20 md:px-10 lg:px-12">
      <span className="pointer-events-none absolute left-8 top-6 text-[110px] font-bold leading-none tracking-tight text-[#93ad52]/70 md:text-[130px]">
        03
      </span>

      <div className="relative mt-28 max-w-sm space-y-5">
        <h2 className="text-4xl font-semibold tracking-tight text-black">
          What We Offer
        </h2>
        <p className="text-lg leading-9 text-neutral-700">
          At the Natural Health Academy, we offer a range of programs and
          certifications that cover essential topics in natural health,
          including herbal medicine, nutrition, mindfulness, and holistic
          therapies. Whether you're looking to deepen your understanding for
          personal enrichment or to start a career in natural health, our
          curriculum combines scientific research with time-tested practices.
        </p>
      </div>
    </div>
  </div>
</section>
<section className="bg-[#f7f7f3] px-6 py-16 md:px-10 lg:px-5">
  <div className="mx-auto max-w-7xl">
    <div className="mb-12">
      <h2 className="text-4xl font-semibold tracking-tight text-[#232742] md:text-5xl">
        Journey to Health
      </h2>
      <div className="mt-4 h-[2px] w-24 bg-[#7a9442]" />
    </div>

    <div className="hidden lg:block">
      <div className="grid grid-cols-5 gap-6">
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-[28px] bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-semibold text-[#232742]">
              1: Foundation
            </h3>
            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <p>→ Diet</p>
              <p>→ Gut health</p>
              <p>→ Sleep</p>
            </div>
          </div>
        </div>

        <div />
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-[28px] bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-semibold text-[#232742]">
              3: Vitality
            </h3>
            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <p>→ Cardio</p>
              <p>→ Hormones</p>
            </div>
          </div>
        </div>

        <div />
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-[28px] bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-semibold text-[#232742]">
              5: Longevity
            </h3>
            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <p>→ Mitochondria</p>
              <p>→ Cognition</p>
              <p>→ Genetics & Prevention</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative my-8">
        <div className="h-6 rounded-full bg-[#232323] shadow-[0_12px_30px_rgba(0,0,0,0.18)]" />
        <div className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 bg-white/80" />

        <div className="absolute left-[10%] top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#7a9442] bg-white shadow-[0_0_0_6px_rgba(122,148,66,0.18)]" />
        <div className="absolute left-[30%] top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#7a9442] bg-white shadow-[0_0_0_6px_rgba(122,148,66,0.18)]" />
        <div className="absolute left-[50%] top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#7a9442] bg-white shadow-[0_0_0_6px_rgba(122,148,66,0.18)]" />
        <div className="absolute left-[70%] top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#7a9442] bg-white shadow-[0_0_0_6px_rgba(122,148,66,0.18)]" />
        <div className="absolute left-[90%] top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#7a9442] bg-white shadow-[0_0_0_6px_rgba(122,148,66,0.18)]" />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div />
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-[28px] bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-semibold text-[#232742]">
              2: Resilience
            </h3>
            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <p>→ Adrenals</p>
              <p>→ Detox</p>
              <p>→ Immunity</p>
            </div>
          </div>
        </div>

        <div />
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-[28px] bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-2xl font-semibold text-[#232742]">
              4: Maintenance
            </h3>
            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <p>→ Bones</p>
              <p>→ Hair & Skin</p>
              <p>→ Teeth</p>
            </div>
          </div>
        </div>
        <div />
      </div>
    </div>

    <div className="grid gap-6 lg:hidden">
      <div className="rounded-[24px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <h3 className="text-xl font-semibold text-[#232742]">1: Foundation</h3>
        <div className="mt-4 space-y-3 text-base text-slate-500">
          <p>→ Diet</p>
          <p>→ Gut health</p>
          <p>→ Sleep</p>
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <h3 className="text-xl font-semibold text-[#232742]">2: Resilience</h3>
        <div className="mt-4 space-y-3 text-base text-slate-500">
          <p>→ Adrenals</p>
          <p>→ Detox</p>
          <p>→ Immunity</p>
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <h3 className="text-xl font-semibold text-[#232742]">3: Vitality</h3>
        <div className="mt-4 space-y-3 text-base text-slate-500">
          <p>→ Cardio</p>
          <p>→ Hormones</p>
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <h3 className="text-xl font-semibold text-[#232742]">4: Maintenance</h3>
        <div className="mt-4 space-y-3 text-base text-slate-500">
          <p>→ Bones</p>
          <p>→ Hair & Skin</p>
          <p>→ Teeth</p>
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <h3 className="text-xl font-semibold text-[#232742]">5: Longevity</h3>
        <div className="mt-4 space-y-3 text-base text-slate-500">
          <p>→ Mitochondria</p>
          <p>→ Cognition</p>
          <p>→ Genetics & Prevention</p>
        </div>
      </div>
    </div>
  </div>
</section>

     
    </main>
  );
}