"use client";

import { useRef, useTransition } from "react";
import { sendContactEmail } from "./actions/send-contact-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  HeartHandshake,
  Leaf,
} from "lucide-react";
import { toast } from "sonner";

const contactItems = [
  {
    icon: Mail,
    title: "Email",
    description: "Reach out for support, partnerships, or course inquiries.",
    value: "happynutritionhealth@gmail.com",
  },
 
  {
    icon: Clock,
    title: "Hours",
    description: "We do our best to respond promptly during business hours.",
    value: "Mon - Fri, 9:00 AM - 5:00 PM",
  },
];

export default function ContactPage() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await sendContactEmail(formData);

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Message sent successfully!");
      formRef.current?.reset();
    });
  };

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-emerald-50/70 via-background to-background dark:from-emerald-950/20" />
      <div className="absolute left-[-80px] top-[-60px] -z-20 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10" />
      <div className="absolute bottom-[-80px] right-[-60px] -z-20 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-500/10" />

      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
          <section className="space-y-8">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/80 px-4 py-1.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-800 dark:bg-background/80 dark:text-emerald-300">
                <Leaf className="size-4" />
                Contact Health Academy
              </span>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
                  Support for your wellness and learning journey
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                  Whether you have questions about our courses, workshops, or
                  wellness programs, we’re here to help. Reach out to our team
                  and we’ll respond with care, clarity, and guidance.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border bg-background/80 shadow-sm backdrop-blur">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-transparent to-teal-100/60 dark:from-emerald-900/20 dark:to-teal-900/20" />

              <div className="relative grid gap-8 p-8 md:grid-cols-[1.15fr_0.85fr] md:p-10">
                <div className="space-y-5">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <HeartHandshake className="size-5" />
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold">
                      A calm, thoughtful approach
                    </h2>
                    <p className="text-sm leading-7 text-muted-foreground">
                      We believe wellness education should feel supportive,
                      practical, and approachable. Whether you’re exploring a
                      course, booking a workshop, or asking about partnerships,
                      we’ll help you find the right next step.
                    </p>
                  </div>

                  <div className="grid gap-3 pt-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm dark:bg-background/70">
                      Thoughtful support
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm dark:bg-background/70">
                      Wellness-focused guidance
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm dark:bg-background/70">
                      Prompt responses
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[260px] overflow-hidden rounded-[1.75rem] border bg-gradient-to-br from-emerald-200/60 via-white to-teal-100/70 dark:from-emerald-900/30 dark:via-background dark:to-teal-900/20">
                  <div className="absolute left-6 top-6 h-24 w-24 rounded-full bg-white/70 blur-2xl dark:bg-white/10" />
                  <div className="absolute bottom-6 right-6 h-28 w-28 rounded-full bg-emerald-300/40 blur-2xl dark:bg-emerald-500/10" />

                  <div className="relative flex h-full flex-col justify-between p-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        Wellness-centered communication
                      </p>
                      <h3 className="max-w-xs text-xl font-semibold leading-snug">
                        Guidance that feels supportive, professional, and human
                      </h3>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm shadow-sm backdrop-blur">
                        Course questions and access support
                      </div>
                      <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm shadow-sm backdrop-blur">
                        Corporate wellness and workshop inquiries
                      </div>
                      <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm shadow-sm backdrop-blur">
                        Partnership and collaboration opportunities
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {contactItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Card
                    key={item.title}
                    className="rounded-[1.75rem] border bg-background/80 shadow-sm backdrop-blur"
                  >
                    <CardContent className="space-y-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <Icon className="size-5" />
                      </div>

                      <div className="space-y-1.5">
                        <h2 className="text-base font-semibold">{item.title}</h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                        <p className="pt-1 text-sm font-medium text-foreground">
                          {item.value}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-white/50 blur-3xl dark:bg-white/5" />

            <div className="rounded-[2rem] border bg-background/90 p-6 shadow-xl backdrop-blur md:p-8">
              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-semibold">Send us a message</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Fill out the form below and our team will get back to you
                  shortly.
                </p>
              </div>

              <form ref={formRef} action={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    required
                    disabled={isPending}
                    className="h-12 rounded-2xl border-muted-foreground/20 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    required
                    disabled={isPending}
                    className="h-12 rounded-2xl border-muted-foreground/20 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us how we can support you..."
                    rows={7}
                    required
                    disabled={isPending}
                    className="resize-none rounded-2xl border-muted-foreground/20 bg-background"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full rounded-2xl bg-emerald-600 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {isPending ? "Sending message..." : "Send Message"}
                </Button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}