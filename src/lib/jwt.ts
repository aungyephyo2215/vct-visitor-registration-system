import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function getSecret(envVar: string): Uint8Array {
  const secret = process.env[envVar];
  if (!secret) {
    throw new Error(`Missing ${envVar} environment variable`);
  }
  return new TextEncoder().encode(secret);
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 86400;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 86400;
  }
}

export async function signAccessToken(
  payload: JWTPayload
): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  const seconds = parseDuration(expiresIn);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(getSecret("JWT_SECRET"));
}

export async function verifyAccessToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("JWT_SECRET"));
    return payload;
  } catch {
    return null;
  }
}

export async function signRefreshToken(
  payload: JWTPayload
): Promise<string> {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const seconds = parseDuration(expiresIn);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(getSecret("JWT_REFRESH_SECRET"));
}

export async function verifyRefreshToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
    return payload;
  } catch {
    return null;
  }
}

export function getAccessTokenMaxAge(): number {
  return parseDuration(process.env.JWT_EXPIRES_IN || "24h");
}

export function getRefreshTokenMaxAge(): number {
  return parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || "7d");
}
