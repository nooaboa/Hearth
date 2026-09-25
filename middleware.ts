import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "hearth_operator";

async function sessionToken() {
  const password = process.env.OPERATOR_PASSWORD ?? "";
  if (!password) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("hearth-operator-v1"));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login")) return NextResponse.next();
  const token = await sessionToken();
  if (!token || request.cookies.get(COOKIE)?.value !== token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|mark.png|logo.png).*)"] };
