import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./src/models/User";
import { LoginThrottle } from "./src/models/AuthSecurity";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const email = String(process.env.SUPER_ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const user = await User.findOne({ email })
      .select("email role failedLoginAttempts failedLoginWindowStartedAt lockedUntil isApproved password");

    const throttleCount = await LoginThrottle.countDocuments({});

    console.log("==========================================");
    console.log("AUTH DATABASE DIAGNOSTIC");
    console.log("==========================================");
    console.log("Mongo Host:", mongoose.connection.host);
    console.log("Mongo DB:", mongoose.connection.name);
    console.log("User Found:", Boolean(user));
    console.log("User Email:", user?.email);
    console.log("Role:", user?.role);
    console.log("Approved:", user?.isApproved);
    console.log("Failed Attempts:", user?.failedLoginAttempts);
    console.log("Failed Window:", user?.failedLoginWindowStartedAt);
    console.log("Locked Until:", user?.lockedUntil);
    console.log("Password Length:", user?.password?.length);
    console.log("LoginThrottle Records:", throttleCount);
    console.log("==========================================");
  } catch (error) {
    console.error("ERROR:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
