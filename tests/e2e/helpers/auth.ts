import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PrismaClient } from "../../../src/generated/prisma/client";
import { E2E_SEED } from "../fixtures/seed-ids";
import {
  buildSessionCookie,
  signSessionCookieValue,
} from "./session-cookie";

const AUTH_DIR = path.join(__dirname, "..", ".auth");

async function upsertSession(
  prisma: PrismaClient,
  userId: string,
  sessionId: string
) {
  const crypto = await import("node:crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  await prisma.session.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      token,
      userId,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      token,
      expiresAt,
      updatedAt: now,
    },
  });

  return { token, expiresAt };
}

async function saveStorageState(
  role: "student" | "admin",
  token: string,
  expiresAt: Date
) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for E2E auth setup.");
  }

  const signedValue = await signSessionCookieValue(token, secret);
  const cookie = buildSessionCookie(signedValue, expiresAt);

  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([cookie]);

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({
    path: path.join(AUTH_DIR, `${role}.json`),
  });

  await browser.close();
}

export async function createAuthStorageStates(prisma: PrismaClient) {
  const studentSession = await upsertSession(
    prisma,
    E2E_SEED.studentUser,
    "e2e-session-student"
  );
  const adminSession = await upsertSession(
    prisma,
    E2E_SEED.adminUser,
    "e2e-session-admin"
  );

  await Promise.all([
    saveStorageState("student", studentSession.token, studentSession.expiresAt),
    saveStorageState("admin", adminSession.token, adminSession.expiresAt),
  ]);
}
