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
        await resend.emails.send({
          from: "Health Academy <onboarding@resend.dev>",
          to: [email],
          subject: "Health Academy - Verify your email",
          html: buildOtpEmailHtml(otp),
        });
      },
    }),
    admin(),
  ],
});
