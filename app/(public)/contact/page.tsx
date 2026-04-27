import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-12">
      {/* Hero */}
      <section className="mx-auto max-w-5xl space-y-6 py-8 text-center md:py-12">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7a9442]">
          Natural Health Academy
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-[#232742] md:text-5xl lg:text-6xl">
          Advanced Nutrition & Holistic Health Courses
        </h1>

        <div className="mx-auto h-[2px] w-20 bg-[#7a9442]" />

        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-lg leading-8 text-muted-foreground md:text-xl">
            Welcome to the Natural Health Academy by Happy Nutrition LTD, where
            we empower individuals with the knowledge, tools, and confidence to
            take charge of their health through natural, evidence-based
            approaches.
          </p>

          <p className="text-base leading-8 text-muted-foreground md:text-lg">
            Our academy provides comprehensive education, practical resources,
            and ongoing support to guide students toward holistic wellness,
            blending timeless traditions with modern insight to create
            sustainable health solutions.
          </p>
        </div>
      </section>

      {/* Instructors */}
      <section className="space-y-8">
        <h2 className="text-center text-3xl font-semibold">Our Instructors</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <InstructorCard
            name="Olga Grass"
            role="Founder"
            image="https://health-academy-lms.t3.tigrisfiles.io/pinterest-profile-Olga-1.jpg"
            description="Olga Grass is a Certified Nutritional Practitioner, Registered Nutritional Therapist, and Holistic Health Coach dedicated to empowering clients through personalized nutrition and holistic wellness strategies."
          />

          <InstructorCard
            name="Alex Kostikov"
            role="Founder"
            image="https://health-academy-lms.t3.tigrisfiles.io/pinterest-profile-Alex.jpg"
            description="Alex Kostikov is a European-trained Medical Doctor and researcher with over 25 years of experience, combining medical expertise and research to empower individuals."
          />
        </div>
      </section>

      {/* Mission */}
      <section className="border-y bg-[#f7f7f3]">
        <div className="mx-auto grid max-w-7xl md:grid-cols-3">
          <MissionCard
            number="01"
            title="Our Mission"
            text="To make holistic health knowledge accessible, practical, and transformative. We empower individuals to take control of their wellness journey."
          />

          <MissionCard
            number="02"
            title="Why Choose Us"
            text="Our educators are leaders in their fields. With interactive courses and workshops, we create a learning environment that is enriching and accessible."
          />

          <MissionCard
            number="03"
            title="What We Offer"
            text="Whether you&apos;re looking to deepen your understanding or start a career, our programs combine scientific research with time-tested practices."
          />
        </div>
      </section>

      {/* Journey */}
      <section className="bg-[#f7f7f3] px-6 py-16 md:px-10 lg:px-5">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-6 text-4xl font-semibold text-[#232742]">
            Journey to Health
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <JourneyCard title="1: Foundation" items={["Diet", "Gut health", "Sleep"]} />
            <JourneyCard title="2: Resilience" items={["Adrenals", "Detox", "Immunity"]} />
            <JourneyCard title="3: Vitality" items={["Cardio", "Hormones"]} />
            <JourneyCard title="4: Maintenance" items={["Bones", "Hair & Skin", "Teeth"]} />
            <JourneyCard
              title="5: Longevity"
              items={["Mitochondria", "Cognition", "Prevention"]}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- COMPONENTS ---------- */

function InstructorCard({
  name,
  role,
  image,
  description,
}: {
  name: string;
  role: string;
  image: string;
  description: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-[30rem] w-full">
        <Image src={image} alt={name} fill className="object-cover" />
      </div>

      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <p className="text-sm text-muted-foreground">{role}</p>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MissionCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="relative border-b px-8 py-20 md:border-b-0 md:border-r">
      <span className="absolute left-8 top-6 text-[100px] font-bold text-[#93ad52]/70">
        {number}
      </span>

      <div className="mt-28 space-y-4">
        <h2 className="text-3xl font-semibold">{title}</h2>
        <p className="text-lg text-neutral-700">{text}</p>
      </div>
    </div>
  );
}

function JourneyCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="text-xl font-semibold">{title}</h3>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <p key={item}>→ {item}</p>
        ))}
      </div>
    </div>
  );
}