import { makeSignature } from "better-auth/crypto";

const SESSION_COOKIE = "better-auth.session_token";

export async function signSessionCookieValue(
  sessionToken: string,
  secret: string
) {
  return `${sessionToken}.${await makeSignature(sessionToken, secret)}`;
}

export function buildSessionCookie(
  signedValue: string,
  expiresAt: Date
): {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax";
  expires: number;
} {
  return {
    name: SESSION_COOKIE,
    value: signedValue,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(expiresAt.getTime() / 1000),
  };
}
