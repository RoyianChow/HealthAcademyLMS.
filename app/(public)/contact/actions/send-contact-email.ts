"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    await resend.emails.send({
      from: "onboarding@resend.dev", // change later to your domain
      to: "happynutritionhealth@gmail.com", // change later to your email
      subject: `Natural Health Academy: ${subject}`,
      replyTo: email,
      html: `
        <h2>Natural Health Academy Email</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to send email" };
  }
}
