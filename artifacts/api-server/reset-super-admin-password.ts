import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./src/models/User";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const email = String(process.env.SUPER_ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const plainPassword = String(process.env.SUPER_ADMIN_PASSWORD || "");

    if (!email) {
      throw new Error("SUPER_ADMIN_EMAIL is missing.");
    }

    if (!plainPassword) {
      throw new Error("SUPER_ADMIN_PASSWORD is missing.");
    }

    const user = await User.findOne({
      email,
      role: "super_admin",
    });

    if (!user) {
      throw new Error(`Super Admin not found for ${email}`);
    }

    const newHash = await bcrypt.hash(plainPassword, 12);

    user.password = newHash;
    user.failedLoginAttempts = 0;
    user.failedLoginWindowStartedAt = undefined;
    user.lockedUntil = undefined;

    await user.save();

    const verification = await bcrypt.compare(
      plainPassword,
      user.password
    );

    console.log("==========================================");
    console.log("SUPER ADMIN PASSWORD RESET");
    console.log("==========================================");
    console.log("User:", user.email);
    console.log("Role:", user.role);
    console.log("Password configured:", Boolean(plainPassword));
    console.log("Password length:", plainPassword.length);
    console.log("New hash length:", user.password.length);
    console.log("Bcrypt verification:", verification ? "PASS" : "FAIL");
    console.log("==========================================");
  } catch (error) {
    console.error("ERROR:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
