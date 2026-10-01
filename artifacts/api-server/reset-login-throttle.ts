import "dotenv/config";
import mongoose from "mongoose";
import { LoginThrottle } from "./src/models/AuthSecurity";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const result = await LoginThrottle.deleteMany({});

    console.log("==========================================");
    console.log("LOGIN THROTTLE RESET");
    console.log("Deleted throttle records:", result.deletedCount);
    console.log("==========================================");
  } catch (error) {
    console.error("ERROR:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
