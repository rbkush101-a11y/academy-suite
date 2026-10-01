import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

async function createSuperAdmin() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("MONGODB_URI is missing in .env file");
    process.exit(1);
  }

  const email = String(process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const plainPassword = String(process.env.SUPER_ADMIN_PASSWORD || "");
  const name = String(
    process.env.SUPER_ADMIN_NAME || "Platform Administrator",
  ).trim();

  if (!email) {
    console.error("SUPER_ADMIN_EMAIL is missing in .env file");
    process.exit(1);
  }

  if (!plainPassword) {
    console.error("SUPER_ADMIN_PASSWORD is missing in .env file");
    process.exit(1);
  }

  if (plainPassword.length < 12) {
    console.error(
      "SUPER_ADMIN_PASSWORD must be at least 12 characters long",
    );
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    // Remove an existing account with this email so we can
    // create a clean platform administrator account.
    const deleteResult = await User.deleteMany({
      email,
    });

    console.log("Deleted existing matching users:", deleteResult.deletedCount);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "super_admin",
      isApproved: true,
    });

    const isPasswordCorrect = await bcrypt.compare(
      plainPassword,
      user.password,
    );

    console.log("");
    console.log("==========================================");
    console.log("Fresh Super Admin created successfully");
    console.log("==========================================");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Approved:", user.isApproved);
    console.log(
      "Password Test:",
      isPasswordCorrect ? "PASS" : "FAIL",
    );
    console.log("==========================================");
    console.log("");
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin().catch(async (error) => {
  console.error("Error creating Super Admin:", error);

  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors.
  }

  process.exit(1);
});