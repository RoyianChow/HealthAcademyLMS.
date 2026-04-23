"use client";

import { useTransition } from "react";
import { sendContactEmail } from "./actions/send-contact-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ContactPage() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await sendContactEmail(formData);

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Message sent successfully!");
      }
    });
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <p className="text-sm text-muted-foreground">
            Send us a message and we’ll get back to you shortly.
          </p>
        </CardHeader>

        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <Input name="name" placeholder="Your Name" required />
            <Input name="email" type="email" placeholder="Your Email" required />
            <Textarea
              name="message"
              placeholder="Your Message"
              rows={5}
              required
            />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}