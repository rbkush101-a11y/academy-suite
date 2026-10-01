import "dotenv/config";
import mongoose from "mongoose";
import { Institute } from "./src/models/Institute";
import { Branch } from "./src/models/Branch";
import { User } from "./src/models/User";
import { Student } from "./src/models/Student";
import { Staff } from "./src/models/Staff";
import { Course } from "./src/models/Course";
import { PlatformSubscription, PlatformPlan } from "./src/models/Platform";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from environment.");

  await mongoose.connect(uri, { dbName: "coach_sutra" });
  console.log("\n==================================================");
  console.log("SECOND SCHOOL CLASSES — COACH_SUTRA AUDIT");
  console.log("==================================================");
  console.log("Database:", mongoose.connection.db?.databaseName);

  const institutes = await Institute.find({
    instituteName: { $regex: "second\\s*school", $options: "i" },
  }).sort({ createdAt: 1 }).lean();

  console.log("\nMatching institutes found:", institutes.length);

  for (const institute of institutes) {
    const instituteId = institute._id;

    const [branches, users, students, staff, courses, subscriptions] = await Promise.all([
      Branch.find({ instituteId }).sort({ isMain: -1, createdAt: 1 }).lean(),
      User.find({ instituteId }).select("_id name email phone role isApproved activeBranchId branchIds createdAt updatedAt").sort({ createdAt: 1 }).lean(),
      Student.countDocuments({ instituteId }),
      Staff.countDocuments({ instituteId }),
      Course.countDocuments({ instituteId }),
      PlatformSubscription.find({ instituteId }).populate("planId", "name code monthlyPrice yearlyPrice maxStudents maxBranches status").sort({ createdAt: -1 }).lean(),
    ]);

    console.log("\n--------------------------------------------------");
    console.log("INSTITUTE");
    console.log("--------------------------------------------------");
    console.log("ID:", String(institute._id));
    console.log("Name:", institute.instituteName);
    console.log("Type:", institute.instituteType);
    console.log("Owner:", institute.ownerName);
    console.log("Email:", institute.email);
    console.log("Phone:", institute.phone);
    console.log("Website:", institute.website || "");
    console.log("Domain:", institute.domain || "");
    console.log("Status:", institute.status);
    console.log("Plan field:", institute.plan);
    console.log("Expiry date:", institute.expiryDate?.toISOString?.() ?? "NOT SET");
    console.log("Academic year:", institute.academicYear || "");
    console.log("Default branch ID:", institute.defaultBranchId ? String(institute.defaultBranchId) : "NOT SET");
    console.log("Initial admin ID:", institute.initialAdminId ? String(institute.initialAdminId) : "NOT SET");
    console.log("Created:", institute.createdAt);
    console.log("Updated:", institute.updatedAt);

    console.log("\nBRANCHES:", branches.length);
    for (const branch of branches) {
      console.log(`- ${branch.name} | code=${branch.code} | id=${branch._id} | status=${branch.status} | main=${branch.isMain}`);
      console.log(`  address=${branch.address || ""} | phone=${branch.phone || ""} | email=${branch.email || ""}`);
    }

    console.log("\nUSERS:", users.length);
    for (const user of users) {
      console.log(`- ${user.name} | ${user.email} | role=${user.role} | approved=${user.isApproved} | id=${user._id}`);
      console.log(`  activeBranch=${user.activeBranchId ? String(user.activeBranchId) : ""} | branches=${(user.branchIds || []).map(String).join(",")}`);
    }

    console.log("\nDATA COUNTS:");
    console.log("Students:", students);
    console.log("Staff:", staff);
    console.log("Courses:", courses);

    console.log("\nPLATFORM SUBSCRIPTIONS:", subscriptions.length);
    for (const subscription of subscriptions as any[]) {
      const plan = subscription.planId;
      console.log(`- id=${subscription._id}`);
      console.log(`  status=${subscription.status} | billing=${subscription.billingCycle}`);
      console.log(`  startsAt=${subscription.startsAt} | endsAt=${subscription.endsAt || "NOT SET"}`);
      console.log(`  externalReference=${subscription.externalReference || "NOT SET"}`);
      console.log(`  plan=${plan?.name || "UNKNOWN"} (${plan?.code || ""})`);
    }
  }

  console.log("\n==================================================");
  console.log("AUDIT COMPLETE — NO DATA WAS MODIFIED");
  console.log("==================================================\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\nAUDIT FAILED:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
