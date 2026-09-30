import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET or JWT_SECRET must be configured with at least 32 characters.");
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
expiresIn: "7d",
});
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
