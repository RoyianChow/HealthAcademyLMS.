"use server";

import arcjet, { fixedWindow } from "@/lib/arcjet";
import { resend } from "@/lib/resend";
import {
  buildContactConfirmationEmailHtml,
  buildContactNotificationEmailHtml,
} from "@/lib/email/templates";
import { headers } from "next/headers";

const contactLimiter = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "10m",
    max: 3,
  })
);

export async function sendContactEmail(_prevState: unknown, formData: FormData) {
  try {
    const headersList = await headers();
    const decision = await contactLimiter.protect(
      new Request("http://localhost/contact", { headers: headersList }),
      {
        fingerprint: headersList.get("x-forwarded-for") ?? "contact-form",
      }
    );

    if (decision.isDenied()) {
      return { error: "Too many contact requests. Please try again later." };
    }

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    if (!email || !subject || !message) {
      return { error: "Required fields are missing" };
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "A User";

    await Promise.all([
      resend.emails.send({
        from: "onboarding@resend.dev",
        to: "happynutritionhealth@gmail.com",
        subject: `Natural Health Academy: ${subject}`,
        replyTo: email,
        html: buildContactNotificationEmailHtml({
          fullName,
          email,
          subject,
          message,
        }),
      }),
      resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "We received your message — Health Academy",
        html: buildContactConfirmationEmailHtml({
          fullName,
          subject,
        }),
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to send email" };
  }
}
