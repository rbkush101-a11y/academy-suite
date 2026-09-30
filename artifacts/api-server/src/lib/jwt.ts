import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? "coach_sutra_secret_key_2024";
  return secret;
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
