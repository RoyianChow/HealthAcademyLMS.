"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (!name || !email || !message) {
      return { error: "All fields are required" };
    }

    await resend.emails.send({
      from: "onboarding@resend.dev", // change later to your domain
      to: "happynutritionhealth@gmail.com",
      subject: `New Contact Form Submission from ${name}`,
      replyTo: email,
      html: `
        <h2>New Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
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