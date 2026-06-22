'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import journeyStyles from './Journey.module.css';
import wheelStyles from './Wheel.module.css';

const instructors = [
  {
    name: 'Olga Grass',
    role: 'Founder',
    image:
      'https://health-academy-lms.t3.tigrisfiles.io/pinterest-profile-Olga-1.jpg',
    bio: 'Olga Grass is a Certified Nutritional Practitioner, Registered Nutritional Therapist, and Holistic Health Coach dedicated to empowering clients through personalized nutrition and holistic wellness strategies. With a focus on sustainable, whole-food-based approaches, she helps individuals achieve lasting lifestyle changes.',
  },
  {
    name: 'Alex Kostikov',
    role: 'Founder',
    image:
      'https://health-academy-lms.t3.tigrisfiles.io/pinterest-profile-Alex.jpg',
    bio: 'Alex Kostikov is a European-trained Medical Doctor, independent researcher with over 25 years of experience, and dedicated health educator. He combines medical expertise and research to empower individuals to make informed health decisions and embrace proactive wellness.',
  },
];

const missionCards = [
  {
    number: '01',
    title: 'Our Mission',
    text: 'To make holistic health knowledge accessible, practical, and transformative. We believe that everyone deserves to feel empowered in their wellness journey. Our courses are designed to nurture personal and professional growth, equipping our students with the tools they need to live balanced lives and inspire others.',
  },
  {
    number: '02',
    title: 'Why Choose Us',
    text: 'Our educators are leaders in their fields, with experience in academic, clinical, and wellness settings. Through interactive online courses, hands-on workshops, and supportive community resources, we create a learning environment that is practical, welcoming, and accessible.',
  },
  {
    number: '03',
    title: 'What We Offer',
    text: 'At the Natural Health Academy, we offer programs and certifications covering nutrition, herbal medicine, mindfulness, and holistic therapies. Whether you are learning for personal growth or professional development, our curriculum blends scientific research with time-tested practices.',
  },
];

const healthPoints = [
  { title: 'Excretory System', rotation: '0' },
  { title: 'Reproductive System', rotation: '45' },
  { title: 'Endocrine System', rotation: '90' },
  { title: 'Integumentary System', rotation: '135' },
  { title: 'Skeletal & Muscular System', rotation: '180' },
  { title: 'Digestive System', rotation: '225' },
  { title: 'Cardiovascular System', rotation: '270' },
  { title: 'Lymphatic System', rotation: '315' },
];

export default function AboutPage() {
  return (
    <main className="relative overflow-hidden bg-[#fbfbf7] text-[#232742] dark:bg-[#10120f] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-[-12rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[#93ad52]/25 blur-[130px] dark:bg-[#93ad52]/15" />
        <div className="absolute right-[-14rem] top-[30rem] h-[30rem] w-[30rem] rounded-full bg-[#d8b86a]/20 blur-[140px] dark:bg-[#d8b86a]/10" />
        <div className="absolute bottom-[-12rem] left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#7a9442]/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-20 px-4 py-10 sm:px-6 md:py-16 lg:px-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2rem] border border-[#d8dec5] bg-white/80 px-6 py-16 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] md:px-10 md:py-24">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#7a9442] via-[#c7a85d] to-[#7a9442]"
          />

          <div className="mx-auto max-w-4xl space-y-7">
            <div className="inline-flex items-center rounded-full border border-[#93ad52]/30 bg-[#93ad52]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#6f853a] dark:border-[#93ad52]/25 dark:bg-[#93ad52]/10 dark:text-[#c9dd8a]">
              Natural Health Academy
            </div>

            <div className="space-y-5">
              <h1 className="text-balance text-4xl font-bold tracking-tight text-[#232742] dark:text-white md:text-6xl lg:text-7xl">
                Advanced Nutrition & Holistic Health Courses
              </h1>

              <p className="mx-auto max-w-3xl text-lg leading-8 text-neutral-600 dark:text-neutral-300 md:text-xl">
                Welcome to the Natural Health Academy by Happy Nutrition LTD,
                where we empower individuals with the knowledge, tools, and
                confidence to take charge of their health through natural,
                evidence-based approaches.
              </p>
            </div>

            <p className="mx-auto max-w-3xl text-base leading-8 text-neutral-500 dark:text-neutral-400 md:text-lg">
              Our academy provides comprehensive education, practical resources,
              and ongoing support to guide students toward holistic wellness,
              blending timeless traditions with modern insight to create
              sustainable health solutions.
            </p>

            <div className="mx-auto grid max-w-3xl gap-3 pt-4 sm:grid-cols-3">
              {['Evidence-based learning', 'Holistic wellness', 'Practical guidance'].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#e2e7d3] bg-[#f7f7f3] px-4 py-3 text-sm font-medium text-[#4f5f29] dark:border-white/10 dark:bg-white/[0.05] dark:text-[#d7e7a0]"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        {/* Instructors */}
        <section className="space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7a9442] dark:text-[#c9dd8a]">
              Meet your educators
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#232742] dark:text-white md:text-5xl">
              Our Instructors
            </h2>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg">
              Learn from experienced health educators who combine practical
              clinical knowledge with a passion for natural wellness.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {instructors.map((instructor) => (
              <Card
                key={instructor.name}
                className="group overflow-hidden rounded-[1.75rem] border-[#dfe5cf] bg-white/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="relative h-[28rem] w-full overflow-hidden bg-[#eef1e4] dark:bg-white/[0.04]">
                  <Image
                    src={instructor.image}
                    alt={instructor.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority={instructor.name === 'Olga Grass'}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 px-4 py-2 shadow-sm backdrop-blur dark:bg-black/50">
                    <p className="text-sm font-semibold text-[#232742] dark:text-white">
                      {instructor.role}
                    </p>
                  </div>
                </div>

                <CardHeader className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-[#232742] dark:text-white">
                    {instructor.name}
                  </CardTitle>
                  <div className="h-[2px] w-14 bg-[#7a9442]" />
                </CardHeader>

                <CardContent>
                  <p className="text-sm leading-7 text-neutral-600 dark:text-neutral-300 md:text-base">
                    {instructor.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="overflow-hidden rounded-[2rem] border border-[#dfe5cf] bg-[#f7f7f3] shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid md:grid-cols-3">
            {missionCards.map((card, index) => (
              <article
                key={card.title}
                className="relative min-h-[32rem] border-b border-[#dfe5cf] px-7 py-12 dark:border-white/10 md:border-b-0 md:px-8 lg:px-10"
              >
                {index !== missionCards.length - 1 && (
                  <div className="absolute right-0 top-10 hidden h-[calc(100%-5rem)] w-px bg-[#dfe5cf] dark:bg-white/10 md:block" />
                )}

                <span className="pointer-events-none absolute left-6 top-5 text-[6rem] font-black leading-none tracking-tight text-[#93ad52]/25 dark:text-[#93ad52]/15 md:text-[7rem]">
                  {card.number}
                </span>

                <div className="relative flex h-full flex-col justify-end space-y-5 pt-28">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#93ad52]/15 text-sm font-bold text-[#6f853a] dark:bg-[#93ad52]/10 dark:text-[#c9dd8a]">
                    {card.number}
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight text-[#232742] dark:text-white md:text-4xl">
                    {card.title}
                  </h2>

                  <p className="text-base leading-8 text-neutral-600 dark:text-neutral-300">
                    {card.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Journey */}
        <JourneyToHealth />

        {/* Wheel of Health Section */}
        <WheelOfHealth />

        {/* Quote Section */}
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-[#dfe5cf] bg-white/80 px-6 py-14 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] md:px-12">
          <p className="text-balance text-3xl font-light italic leading-relaxed text-neutral-500 dark:text-neutral-300 md:text-4xl">
            &ldquo;Together, we’re redefining health, one person at a
            time.&rdquo;
          </p>
          <div className="mx-auto mt-7 h-[2px] w-20 bg-[#7a9442]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-[#232742] dark:text-white">
            Founder, Olga Grass
          </p>
        </section>
      </div>
    </main>
  );
}

function JourneyToHealth() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContainer = containerRef.current;

    if (!currentContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          entry.target.classList.add(journeyStyles.visible);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.2,
      },
    );

    observer.observe(currentContainer);

    return () => {
      observer.unobserve(currentContainer);
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#dfe5cf] bg-[#f7f7f3] px-5 py-12 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:px-10 md:py-16">
      <div className={journeyStyles.journeyContainer} ref={containerRef}>
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7a9442] dark:text-[#c9dd8a]">
            Learning pathway
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#232742] dark:text-white md:text-5xl">
            Journey to Health
          </h2>
          <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg">
            A structured path that helps students build strong foundations
            before moving into deeper systems of wellness, resilience, and
            longevity.
          </p>
          <div className="mt-5 h-[2px] w-24 bg-[#7a9442]" />
        </div>

        <div className={journeyStyles.roadMap}>
          <div className={journeyStyles.road} />

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
  const animationFrameRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  useEffect(() => {
    lastScrollTopRef.current = window.scrollY;

    const updateCards = () => {
      const centerPoint = window.innerHeight / 2;

      pointsRef.current.forEach((point) => {
        if (!point) return;

        const rect = point.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const inCenterZone =
          Math.abs(elementCenter - centerPoint) < window.innerHeight * 0.25;
        const isVisible =
          Math.abs(elementCenter - centerPoint) < window.innerHeight * 0.42;

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
      if (animationFrameRef.current) return;

      animationFrameRef.current = window.requestAnimationFrame(() => {
        if (window.innerWidth > 768 && wheelRef.current) {
          const currentScroll = window.scrollY;
          const scrollDelta = currentScroll - lastScrollTopRef.current;

          rotationRef.current += scrollDelta * 0.08;
          wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
          lastScrollTopRef.current = currentScroll;
        } else {
          lastScrollTopRef.current = window.scrollY;
        }

        updateCards();
        animationFrameRef.current = null;
      });
    };

    const handleResize = () => {
      if (window.innerWidth <= 768 && wheelRef.current) {
        rotationRef.current = 0;
        wheelRef.current.style.transform = 'rotate(0deg)';
      }

      updateCards();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    updateCards();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#dfe5cf] bg-white/80 px-5 py-12 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] md:px-10 md:py-16">
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7a9442] dark:text-[#c9dd8a]">
          Whole-body wellness
        </p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#232742] dark:text-white md:text-5xl">
          The Wheel of Health
        </h2>
        <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg">
          Explore the interconnected systems that influence energy, resilience,
          digestion, hormones, and long-term health.
        </p>
        <div className="mt-5 h-[2px] w-24 bg-[#7a9442]" />
      </div>

      <div className={wheelStyles.wheelContainer}>
        <div className={wheelStyles.contentWrapper}>
          <div className={wheelStyles.wheelSection}>
            <div className={wheelStyles.wheelCard}>
              <div className={wheelStyles.wheelImageContainer}>
                <img
                  ref={wheelRef}
                  src="https://healthacademy.ca/wp-content/uploads/2025/03/wheel-removebg-preview.png"
                  alt="Wheel of Health showing interconnected body systems"
                  className={wheelStyles.wheelImage}
                />
              </div>
            </div>
          </div>

          <div className={wheelStyles.contentSection}>
            {healthPoints.map((point, index) => (
              <div
                key={point.title}
                ref={(el) => {
                  pointsRef.current[index] = el;
                }}
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
    </section>
  );
}