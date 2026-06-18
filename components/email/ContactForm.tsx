"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendContactEmail } from "@/app/(public)/contact/actions/send-contact-email";
import { toast } from "sonner";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendContactEmail, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Email sent successfully");
    } else if (state?.error) {
      toast.error("Failed to send email.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Name Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-muted-foreground">First Name</Label>
          <Input 
            id="firstName" 
            name="firstName" 
            placeholder="First Name" 
            className="bg-white border-neutral-200" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-muted-foreground">Last Name</Label>
          <Input 
            id="lastName" 
            name="lastName" 
            placeholder="Last Name" 
            className="bg-white border-neutral-200" 
          />
        </div>
      </div>

      {/* Email Row */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-muted-foreground">
          Email <span className="text-red-400">*</span>
        </Label>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          placeholder="Email Address" 
          required 
          className="bg-white border-neutral-200" 
        />
      </div>

      {/* Subject Row */}
      <div className="space-y-2">
        <Label htmlFor="subject" className="text-muted-foreground">
          Subject <span className="text-red-400">*</span>
        </Label>
        <Input 
          id="subject" 
          name="subject" 
          placeholder="Subject" 
          required 
          className="bg-white border-neutral-200" 
        />
      </div>

      {/* Message Row */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-muted-foreground">
          Your Message <span className="text-red-400">*</span>
        </Label>
        <Textarea 
          id="message" 
          name="message" 
          placeholder="Your Message" 
          required 
          className="min-h-[150px] bg-white border-neutral-200" 
        />
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        variant="wpBlue"
        size="lg"
        disabled={isPending}
        className="disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Submit Form"}
      </Button>
    </form>
  );
}
