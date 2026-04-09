import crypto from "crypto";

const AUTH_SECRET = String(process.env.AUTH_SECRET || "").trim();

if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET zorunludur.");
}

if (AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET en az 32 karakter olmali.");
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(raw) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(raw).digest("base64url");
}

export function createAuthToken(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encoded = base64UrlEncode(JSON.stringify(body));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new Error("Token gecersiz.");
  }

  const [encoded, signature] = token.split(".");
  const expected = sign(encoded);
  if (signature !== expected) {
    throw new Error("Token imzasi gecersiz.");
  }

  const parsed = JSON.parse(base64UrlDecode(encoded));
  if (!parsed?.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token suresi dolmus.");
  }

  return parsed;
}