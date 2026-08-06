import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { signToken } from "../lib/jwt";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/signup", async (_req, res): Promise<void> => {
res.status(403).json({
error: "Public signup is disabled. Please contact administrator.",
});
});

/*
TEMPORARY FIX ROUTE
Login successful hone ke baad is route ko disabled/comment rakho.

router.get("/auth/fix-rbk-super-admin", async (_req, res): Promise<void> => {
const email = "rbkush101@gmail.com";
const plainPassword = "Admin@12345";
const hashedPassword = await bcrypt.hash(plainPassword, 10);

await User.deleteMany({
email: email.toLowerCase().trim(),
});

const user = await User.create({
name: "Rishabh Kushwaha",
email: email.toLowerCase().trim(),
password: hashedPassword,
role: "super_admin",
isApproved: true,
});

const passwordTest = await bcrypt.compare(plainPassword, user.password);

res.json({
message: "RBK Super Admin fixed successfully",
email: user.email,
role: user.role,
isApproved: user.isApproved,
passwordTest: passwordTest ? "PASS" : "FAIL",
loginPassword: plainPassword,
});
});
*/

router.post("/auth/login", async (req, res): Promise<void> => {
const { email, password } = req.body;

/*
console.log("LOGIN BODY EMAIL:", email);
console.log("LOGIN PASSWORD LENGTH:", password ? String(password).length : 0);
*/

if (!email || !password) {
res.status(400).json({ error: "email and password are required" });
return;
}

const cleanEmail = String(email).toLowerCase().trim();

const user = await User.findOne({ email: cleanEmail });

/*
console.log("LOGIN CLEAN EMAIL:", cleanEmail);
console.log("USER FOUND:", user ? "YES" : "NO");
*/

if (!user) {
res.status(401).json({ error: "Invalid credentials" });
return;
}

/*
console.log("DB EMAIL:", user.email);
console.log("DB ROLE:", user.role);
console.log("DB APPROVED:", user.isApproved);
console.log("DB PASSWORD START:", user.password.slice(0, 10));
*/

const match = await bcrypt.compare(String(password), user.password);

/*
console.log("PASSWORD MATCH:", match ? "YES" : "NO");
*/

if (!match) {
res.status(401).json({ error: "Invalid credentials" });
return;
}

if (user.isApproved !== true) {
res.status(403).json({
error: "Your account is pending approval. Please contact administrator.",
});
return;
}

const token = signToken({
userId: String(user._id),
email: user.email,
role: user.role,
instituteId: user.instituteId ? String(user.instituteId) : null,
});

res.json({
token,
user: {
id: String(user._id),
name: user.name,
email: user.email,
role: user.role,
instituteId: user.instituteId ? String(user.instituteId) : null,
isApproved: user.isApproved,
},
});
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
const user = await User.findById(req.user!.userId).select("-password");

if (!user) {
res.status(404).json({ error: "User not found" });
return;
}

res.json({
id: String(user._id),
name: user.name,
email: user.email,
role: user.role,
instituteId: user.instituteId ? String(user.instituteId) : null,
isApproved: user.isApproved,
createdAt: user.createdAt,
});
});

export default router;
