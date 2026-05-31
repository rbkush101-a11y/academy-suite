import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { signToken } from "../lib/jwt";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role: role ?? "admin" });
  const token = signToken({ userId: String(user._id), email: user.email, role: user.role });
  res.status(201).json({ token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ userId: String(user._id), email: user.email, role: user.role });
  res.json({ token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const user = await User.findById(req.user!.userId).select("-password");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: String(user._id), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

export default router;
