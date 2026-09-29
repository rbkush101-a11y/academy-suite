import jwt from "jsonwebtoken";

function getRequiredSecret(): string {
  const secret = process.env["SESSION_SECRET"];

  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required but was not provided.",
    );
  }

  return secret;
}

const SECRET = getRequiredSecret();

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  instituteId?: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SECRET);

  if (typeof decoded === "string") {
    throw new Error("Invalid JWT payload");
  }

  return decoded as JwtPayload;
}