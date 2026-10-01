import jwt from "jsonwebtoken";

const JWT_ISSUER = "pariksha-drishti-api";
const JWT_AUDIENCE = "pariksha-drishti-app";

function getSecret(): string {
  const secret = process.env.ACCESS_TOKEN_SECRET ?? process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ACCESS_TOKEN_SECRET, SESSION_SECRET, or JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export function assertJwtSecret(): void {
  getSecret();
}

export interface JwtPayload {
userId: string;
email: string;
role: string;
instituteId?: string | null;
activeBranchId?: string | null;
customRoleId?: string | null;
sessionId?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: "15m",
});
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;
}
