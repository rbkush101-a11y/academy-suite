import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

async function createSuperAdmin() {
const mongoUri = process.env.MONGODB_URI;
const email = String(process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
const plainPassword = String(process.env.SUPER_ADMIN_PASSWORD ?? "");
const name = String(process.env.SUPER_ADMIN_NAME ?? "Platform Administrator").trim();

if (!mongoUri || !email || plainPassword.length < 12) {
throw new Error("Set MONGODB_URI, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD (at least 12 characters) before provisioning.");
}

await mongoose.connect(mongoUri);

const existing = await User.findOne({ email });
if (existing) {
  if (existing.role !== "super_admin" || existing.instituteId || existing.activeBranchId || existing.branchIds?.length || existing.customRoleId) {
    throw new Error("The configured email belongs to a non-platform or scoped user; refusing to change or delete that account.");
  }
  console.log("A platform Super Admin account already exists for the configured email; no changes made.");
} else {
  const password = await bcrypt.hash(plainPassword, 12);
  const user = await User.create({ name, email, password, role: "super_admin", isApproved: true });
  console.log(`Created platform Super Admin account ${user.email}.`);
}

await mongoose.disconnect();
}

createSuperAdmin().catch(async (error) => {
console.error("Failed to provision Super Admin:", error instanceof Error ? error.message : error);
await mongoose.disconnect();
process.exit(1);
});
