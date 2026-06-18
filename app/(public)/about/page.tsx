'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useRef } from "react";
import journeyStyles from "./Journey.module.css";
import wheelStyles from "./Wheel.module.css";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-12">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl space-y-6 py-8 text-center md:py-12">
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
          <Card className="overflow-hidden">
            <div className="relative h-[30rem] w-full">
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
                wellness strategies. With a focus on sustainable,
                whole-food-based approaches, she helps individuals achieve
                lasting lifestyle changes.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="relative h-[30rem] w-full">
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
                transformative. We believe that everyone deserves to feel
                empowered in their wellness journey. Our courses are designed to
                nurture personal and professional growth, equipping our students
                with the tools they need to live balanced lives and inspire
                others.
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
                experience in both academic and clinical settings. With
                interactive online courses, hands-on workshops, and supportive
                community resources, we are dedicated to creating a learning
                environment that is as enriching as it is accessible. Becoming a
                part of the Natural Health Academy means joining a vibrant,
                supportive community of health enthusiasts, practitioners, and
                lifelong learners.
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
                therapies. Whether you&apos;re looking to deepen your
                understanding for personal enrichment or to start a career in
                natural health, our curriculum combines scientific research with
                time-tested practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Journey */}
      <JourneyToHealth />

      {/* Wheel of Health Section */}
      <WheelOfHealth />

      {/* Quotation Section */}
      <section className="text-center py-12 max-w-2xl mx-auto space-y-4">
        <p className="text-2xl md:text-3xl italic text-neutral-400 font-light leading-relaxed">
          &ldquo;Together, we’re redefining health, one person at a time.&rdquo;
        </p>
        <p className="text-xs font-bold tracking-widest text-neutral-800 uppercase">
          -Founder, Olga Grass
        </p>
      </section>
    </main>
  );
}

function JourneyToHealth() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Target specific unique token from css module
            entry.target.classList.add(journeyStyles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-[#f7f7f3] px-6 py-16 md:px-10 lg:px-5 overflow-hidden">
      <div className={journeyStyles.journeyContainer} ref={containerRef}>
        <div className="mb-4">
          <h2 className="text-4xl font-semibold tracking-tight text-[#232742] md:text-5xl">
            Journey to Health
          </h2>
          <div className="mt-4 h-[2px] w-24 bg-[#7a9442]" />
        </div>
        
        <div className={journeyStyles.roadMap}>
          <div className={journeyStyles.road}></div>

          <div className={`${journeyStyles.milestone} ${journeyStyles.m1}`}>
            <h3>1: Foundation</h3>
            <ul>
              <li>Diet</li>
              <li>Gut health</li>
              <li>Sleep</li>
            </ul>
          </div>

          <div className={`${journeyStyles.milestone} ${journeyStyles.m2}`}>
            <h3>2: Resilience</h3>
            <ul>
              <li>Adrenals</li>
              <li>Detox</li>
              <li>Immunity</li>
            </ul>
          </div>

          <div className={`${journeyStyles.milestone} ${journeyStyles.m3}`}>
            <h3>3: Vitality</h3>
            <ul>
              <li>Cardio</li>
              <li>Hormones</li>
            </ul>
          </div>

          <div className={`${journeyStyles.milestone} ${journeyStyles.m4}`}>
            <h3>4: Maintenance</h3>
            <ul>
              <li>Bones</li>
              <li>Hair & Skin</li>
              <li>Teeth</li>
            </ul>
          </div>

          <div className={`${journeyStyles.milestone} ${journeyStyles.m5}`}>
            <h3>5: Longevity</h3>
            <ul>
              <li>Mitochondria</li>
              <li>Cognition</li>
              <li>Genetics & Prevention</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function WheelOfHealth() {
  const wheelRef = useRef<HTMLImageElement>(null);
  const pointsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef<number>(0);

  useEffect(() => {
    let lastScrollTop = window.scrollY;

    const throttle = (callback: () => void, delay: number) => {
      let timeout: NodeJS.Timeout | null = null;
      return () => {
        if (!timeout) {
          timeout = setTimeout(() => {
            callback();
            timeout = null;
          }, delay);
        }
      };
    };

    const updateCards = () => {
      const centerPoint = window.innerHeight / 2;
      pointsRef.current.forEach((point) => {
        if (!point) return;
        const rect = point.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const inCenterZone = Math.abs(elementCenter - centerPoint) < window.innerHeight * 0.25;
        const isVisible = Math.abs(elementCenter - centerPoint) < window.innerHeight * 0.4;

        if (isVisible) {
          point.classList.add(wheelStyles.active);
          if (inCenterZone) {
            point.classList.add(wheelStyles.inCenter);
          } else {
            point.classList.remove(wheelStyles.inCenter);
          }
        } else {
          point.classList.remove(wheelStyles.active, wheelStyles.inCenter);
        }
      });
    };

    const handleScroll = () => {
      if (window.innerWidth > 768 && wheelRef.current) {
        const currentScroll = window.scrollY;
        const scrollDelta = currentScroll - lastScrollTop;
        rotationRef.current += scrollDelta * 0.1;
        wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
        lastScrollTop = currentScroll;
      } else {
        lastScrollTop = window.scrollY;
      }
      updateCards();
    };

    const optimizedScroll = throttle(handleScroll, 16);
    window.addEventListener('scroll', optimizedScroll);
    updateCards();

    const handleResize = () => {
      if (window.innerWidth <= 768 && wheelRef.current) {
        rotationRef.current = 0;
        wheelRef.current.style.transform = 'rotate(0deg)';
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', optimizedScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const healthPoints = [
    { title: "Excretory System", rotation: "0" },
    { title: "Reproductive System", rotation: "45" },
    { title: "Endocrine System", rotation: "90" },
    { title: "Integumentary System", rotation: "135" },
    { title: "Skeletal & Muscular System", rotation: "180" },
    { title: "Digestive System", rotation: "225" },
    { title: "Cardiovascular System", rotation: "270" },
    { title: "Lymphatic System", rotation: "315" },
  ];

  return (
    <div className={wheelStyles.wheelContainer}>
      <div className="mb-4">
        <h2 className="text-4xl font-semibold tracking-tight text-[#232742] md:text-5xl">
          The Wheel of Health
        </h2>
        <div className="mt-4 h-[2px] w-24 bg-[#7a9442]" />
      </div>

      <div className={wheelStyles.contentWrapper}>
        <div className={wheelStyles.wheelSection}>
          <div className={wheelStyles.wheelCard}>
            <div className={wheelStyles.wheelImageContainer}>
              <img
                ref={wheelRef}
                src="https://healthacademy.ca/wp-content/uploads/2025/03/wheel-removebg-preview.png"
                alt="Wheel of Health"
                className={wheelStyles.wheelImage}
              />
            </div>
          </div>
        </div>

        <div className={wheelStyles.contentSection}>
          {healthPoints.map((point, index) => (
            <div
              key={index}
              ref={(el) => { pointsRef.current[index] = el; }}
              className={wheelStyles.healthPoint}
              data-rotation={point.rotation}
            >
              <div className={wheelStyles.titleDot} />
              <h3>{point.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
