import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PrismaClient } from "../../../src/generated/prisma/client";
import { E2E_SEED } from "../fixtures/seed-ids";

const AUTH_DIR = path.join(__dirname, "..", ".auth");
const SESSION_COOKIE = "better-auth.session_token";

async function upsertSession(prisma: PrismaClient, userId: string, sessionId: string) {
  const token = randomBytes(32).toString("hex");
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

  return token;
}

async function saveStorageState(role: "student" | "admin", token: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({
    path: path.join(AUTH_DIR, `${role}.json`),
  });

  await browser.close();
}

export async function createAuthStorageStates(prisma: PrismaClient) {
  const studentToken = await upsertSession(
    prisma,
    E2E_SEED.studentUser,
    "e2e-session-student"
  );
  const adminToken = await upsertSession(
    prisma,
    E2E_SEED.adminUser,
    "e2e-session-admin"
  );

  await Promise.all([
    saveStorageState("student", studentToken),
    saveStorageState("admin", adminToken),
  ]);
}
