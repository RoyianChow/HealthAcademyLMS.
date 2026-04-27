"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, ReceiptText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfetti } from "@/hooks/use-confetti";
import { cn } from "@/lib/utils";

export default function PaymentSuccessful() {
  const { triggerConfetti } = useConfetti();

  useEffect(() => {
    triggerConfetti();
  }, [triggerConfetti]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md rounded-3xl border bg-background shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="size-11 text-green-500" />
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-green-600">
              Payment Complete
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Payment Successful
            </h1>

            <p className="text-sm leading-6 text-muted-foreground">
              Your payment was processed successfully. You now have access to
              your course from the dashboard.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border bg-muted/40 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-background p-2">
                <ReceiptText className="size-5 text-primary" />
              </div>

              <div>
                <p className="text-sm font-semibold">Access unlocked</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can continue learning, track progress, and access course
                  materials anytime.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({
                size: "lg",
                className: "mt-7 w-full rounded-full",
              })
            )}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Link>

          <p className="mt-4 text-xs text-muted-foreground">
            Thank you for enrolling with Healthy Academy LMS.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}