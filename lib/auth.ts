import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { env } from "./env";
import { emailOTP } from "better-auth/plugins";
import { resend } from "./resend";
import { admin } from "better-auth/plugins";
import { buildOtpEmailHtml } from "./email/templates";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  advanced: {
    // E2E runs next start over http://localhost — secure cookies would not be sent.
    useSecureCookies: process.env.E2E_TEST === "true" ? false : undefined,
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        // Resend does not throw on failure — it returns { error }. Without
        // this check a failed send (e.g. the sandbox onboarding@resend.dev
        // sender, which only delivers to the Resend account owner) reports
        // "Email sent" to the user while nothing ever arrives.
        const { error } = await resend.emails.send({
          from: env.RESEND_FROM_EMAIL,
          to: [email],
          subject: "Health Academy - Verify your email",
          html: buildOtpEmailHtml(otp),
        });

        if (error) {
          console.error("Failed to send verification OTP email:", error);
          throw new Error(error.message ?? "Failed to send verification email");
        }
      },
    }),
    admin(),
  ],
});