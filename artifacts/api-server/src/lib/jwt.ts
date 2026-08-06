import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET ?? "coach_sutra_secret_key_2024";

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
return jwt.verify(token, SECRET) as JwtPayload;
}