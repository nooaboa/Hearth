import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "hearth_operator";

export function passwordConfigured() {
  return Boolean(process.env.OPERATOR_PASSWORD);
}

export function sessionToken() {
  const password = process.env.OPERATOR_PASSWORD ?? "";
  return createHmac("sha256", password).update("hearth-operator-v1").digest("hex");
}

export function passwordMatches(input: string) {
  const expected = process.env.OPERATOR_PASSWORD ?? "";
  if (!expected || input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function isSignedIn() {
  if (!passwordConfigured()) return false;
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value ?? "";
  const token = sessionToken();
  if (value.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(token));
}
