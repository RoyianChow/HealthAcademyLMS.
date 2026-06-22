"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { sendContactEmail } from "@/app/(public)/contact/actions/send-contact-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(sendContactEmail, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Message sent successfully.");
      formRef.current?.reset();
    }

    if (state?.error) {
      toast.error("Failed to send message. Please try again.");
    }
  }, [state]);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-background shadow-2xl shadow-black/5">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(95,127,46,0.12),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(35,39,66,0.08),transparent_28%)]" />

      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden bg-[#232742] p-8 text-white md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(95,127,46,0.5),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(255,255,255,0.13),transparent_25%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur">
                <Mail className="size-6" />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Contact Us
                </p>

                <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                  Have a question? We would love to hear from you.
                </h2>

                <p className="text-pretty text-sm leading-7 text-white/75 md:text-base">
                  Send us a message about courses, enrollment, wellness
                  education, or anything else related to Happy Nutrition.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#b9d98b]" />
                  <div>
                    <p className="text-sm font-semibold">Quick response</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      We will review your message and reply as soon as possible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 size-5 shrink-0 text-[#b9d98b]" />
                  <div>
                    <p className="text-sm font-semibold">Helpful support</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      Ask about course details, access, learning paths, or
                      general support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="space-y-6 bg-card p-6 md:p-8 lg:p-10"
        >
          {state?.success ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[#5f7f2e]/25 bg-[#5f7f2e]/10 p-4 text-sm text-[#5f7f2e]">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Message sent successfully.</p>
                <p className="mt-1 text-muted-foreground">
                  Thank you for reaching out. We will get back to you soon.
                </p>
              </div>
            </div>
          ) : null}

          {state?.error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Something went wrong.</p>
                <p className="mt-1 text-muted-foreground">
                  Please check your details and try sending the message again.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </Label>

              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="First Name"
                  autoComplete="given-name"
                  disabled={isPending}
                  className="h-12 rounded-2xl border-border/70 bg-background pl-10 shadow-sm transition focus-visible:ring-[#5f7f2e]/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </Label>

              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Last Name"
                  autoComplete="family-name"
                  disabled={isPending}
                  className="h-12 rounded-2xl border-border/70 bg-background pl-10 shadow-sm transition focus-visible:ring-[#5f7f2e]/40"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </Label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isPending}
                className="h-12 rounded-2xl border-border/70 bg-background pl-10 shadow-sm transition focus-visible:ring-[#5f7f2e]/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>

            <Input
              id="subject"
              name="subject"
              placeholder="How can we help?"
              required
              disabled={isPending}
              className="h-12 rounded-2xl border-border/70 bg-background shadow-sm transition focus-visible:ring-[#5f7f2e]/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Your Message <span className="text-destructive">*</span>
            </Label>

            <Textarea
              id="message"
              name="message"
              placeholder="Write your message here..."
              required
              disabled={isPending}
              className="min-h-[170px] resize-none rounded-2xl border-border/70 bg-background shadow-sm transition focus-visible:ring-[#5f7f2e]/40"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-muted-foreground">
              By submitting this form, you agree to be contacted about your
              request.
            </p>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="rounded-full bg-[#5f7f2e] px-7 text-white shadow-lg shadow-[#5f7f2e]/20 transition hover:-translate-y-0.5 hover:bg-[#4f6a25] disabled:translate-y-0 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Submit Form
                  <Send className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}