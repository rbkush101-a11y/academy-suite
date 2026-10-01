import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./src/models/User";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const email = String(process.env.SUPER_ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const result = await User.updateOne(
      {
        email,
        role: "super_admin",
      },
      {
        $set: {
          failedLoginAttempts: 0,
        },
        $unset: {
          failedLoginWindowStartedAt: 1,
          lockedUntil: 1,
        },
      }
    );

    console.log("RESET RESULT:", result);
  } catch (error) {
    console.error("ERROR:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
