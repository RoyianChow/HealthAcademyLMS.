"use server";

import { resend } from "@/lib/resend";
import {
  buildContactConfirmationEmailHtml,
  buildContactNotificationEmailHtml,
} from "@/lib/email/templates";

export async function sendContactEmail(_prevState: unknown, formData: FormData) {
  try {
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