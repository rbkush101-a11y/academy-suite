import "dotenv/config";
import mongoose from "mongoose";
import { Institute } from "./src/models/Institute.js";
import { Branch } from "./src/models/Branch.js";
import { User } from "./src/models/User.js";
import {
  PlatformPlan,
  PlatformSubscription,
} from "./src/models/Platform.js";

const TARGET_DB = "universal_saas";

const TARGET_INSTITUTE_ID = "6a3a58c35606d0ac9f569973";
const TARGET_NAME = "Second School Classes";
const TARGET_EMAIL = "rbkush101@gmail.com";

const BRANCH_NAME = "Preetam Nagar";
const BRANCH_CODE = "PN";

// 10 October 2026, 23:59:59.999 IST
// IST = UTC + 05:30
const END_AT = new Date("2026-10-10T18:29:59.999Z");

async function main() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  // IMPORTANT:
  // Explicitly select universal_saas so this script can never
  // accidentally run against test/coach_sutra/default DB.
  await mongoose.connect(mongoUri, {
    dbName: TARGET_DB,
  });

  console.log("==================================================");
  console.log("SECOND SCHOOL CLASSES — LEGACY MIGRATION");
  console.log("==================================================");
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Target DB: ${TARGET_DB}`);

  if (mongoose.connection.name !== TARGET_DB) {
    throw new Error(
      `Safety check failed. Expected database '${TARGET_DB}', connected to '${mongoose.connection.name}'.`,
    );
  }

  // --------------------------------------------------
  // 1. FIND EXISTING LEGACY INSTITUTE
  // --------------------------------------------------

  const institutes = await Institute.find({
    $or: [
      {
        _id: new mongoose.Types.ObjectId(TARGET_INSTITUTE_ID),
      },
      {
        instituteName: TARGET_NAME,
        email: TARGET_EMAIL,
      },
    ],
  }).limit(5);

  if (institutes.length !== 1) {
    throw new Error(
      `Expected exactly 1 target institute, found ${institutes.length}. Refusing to modify data.`,
    );
  }

  const institute = institutes[0];

  console.log(
    `Institute: ${institute.instituteName} (${institute._id})`,
  );

  if (String(institute._id) !== TARGET_INSTITUTE_ID) {
    throw new Error(
      `Institute ID mismatch. Expected ${TARGET_INSTITUTE_ID}, found ${institute._id}.`,
    );
  }

  if (institute.instituteName !== TARGET_NAME) {
    throw new Error(
      "Target institute name mismatch. Refusing to modify data.",
    );
  }

  // --------------------------------------------------
  // 2. FIND OR CREATE PREETAM NAGAR BRANCH
  // --------------------------------------------------

  let branch = await Branch.findOne({
    instituteId: institute._id,
    code: BRANCH_CODE,
  });

  if (!branch) {
    branch = await Branch.create({
      instituteId: institute._id,
      name: BRANCH_NAME,
      code: BRANCH_CODE,
      status: "active",
      isMain: true,
      address: "Preetam Nagar",
    });

    console.log(
      `✓ Created branch: ${branch.name} (${branch.code})`,
    );
  } else {
    const updates: Record<string, unknown> = {};

    if (branch.name !== BRANCH_NAME) {
      updates.name = BRANCH_NAME;
    }

    if (branch.status !== "active") {
      updates.status = "active";
    }

    if (!branch.isMain) {
      updates.isMain = true;
    }

    if (!branch.address) {
      updates.address = "Preetam Nagar";
    }

    if (Object.keys(updates).length > 0) {
      Object.assign(branch, updates);
      await branch.save();

      console.log(
        `✓ Updated existing branch: ${branch._id}`,
      );
    } else {
      console.log(
        `✓ Branch already correct: ${branch._id}`,
      );
    }
  }

  // Make sure PN is the only main branch for this institute.
  await Branch.updateMany(
    {
      instituteId: institute._id,
      _id: { $ne: branch._id },
      isMain: true,
    },
    {
      $set: {
        isMain: false,
      },
    },
  );

  // --------------------------------------------------
  // 3. FIND EXISTING INSTITUTE ADMIN
  // --------------------------------------------------

  let admin = institute.initialAdminId
    ? await User.findOne({
        _id: institute.initialAdminId,
        instituteId: institute._id,
        role: "institute_admin",
      })
    : null;

  if (!admin) {
    admin = await User.findOne({
      instituteId: institute._id,
      role: "institute_admin",
    }).sort({ createdAt: 1 });
  }

  if (!admin) {
    throw new Error(
      "No existing institute_admin found. Refusing to create a new admin automatically.",
    );
  }

  // --------------------------------------------------
  // 4. LINK ADMIN TO PREETAM NAGAR
  // --------------------------------------------------

  const adminBranchIds = new Set(
    (admin.branchIds ?? []).map(String),
  );

  adminBranchIds.add(String(branch._id));

  admin.activeBranchId = branch._id;

  admin.branchIds = Array.from(adminBranchIds).map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  await admin.save();

  console.log(
    `✓ Linked existing admin: ${admin.email}`,
  );

  // --------------------------------------------------
  // 5. LINK EXISTING TEACHER / STAFF / ACCOUNTANT USERS
  // --------------------------------------------------

  const scopedUsers = await User.find({
    instituteId: institute._id,
    role: {
      $in: [
        "teacher",
        "staff",
        "accountant",
      ],
    },
  });

  for (const user of scopedUsers) {
    const branchIds = new Set(
      (user.branchIds ?? []).map(String),
    );

    branchIds.add(String(branch._id));

    user.branchIds = Array.from(branchIds).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    if (!user.activeBranchId) {
      user.activeBranchId = branch._id;
    }

    await user.save();
  }

  console.log(
    `✓ Linked ${scopedUsers.length} existing teacher/staff/accountant users to PN`,
  );

  // --------------------------------------------------
  // 6. UPDATE INSTITUTE
  // --------------------------------------------------

  institute.defaultBranchId = branch._id;
  institute.initialAdminId = admin._id;

  if (!institute.plan) {
    institute.plan = "starter";
  }

  institute.expiryDate = END_AT;

  if (!institute.academicYear) {
    institute.academicYear = "2026-2027";
  }

  await institute.save();

  console.log(
    "✓ Updated institute defaultBranchId, initialAdminId and expiryDate",
  );

  // --------------------------------------------------
  // 7. FIND EXISTING STARTER PLAN
  // --------------------------------------------------

  const plan = await PlatformPlan.findOne({
    code: institute.plan,
  });

  if (!plan) {
    throw new Error(
      `PlatformPlan '${institute.plan}' not found. Refusing to create a duplicate plan.`,
    );
  }

  console.log(
    `✓ Using existing plan: ${plan.name} (${plan.code})`,
  );

  // --------------------------------------------------
  // 8. FIND OR CREATE PLATFORM SUBSCRIPTION
  // --------------------------------------------------

  let subscription =
    await PlatformSubscription.findOne({
      instituteId: institute._id,
    }).sort({
      createdAt: -1,
    });

  if (!subscription) {
    subscription =
      await PlatformSubscription.create({
        instituteId: institute._id,
        planId: plan._id,
        status: "active",
        billingCycle: "monthly",
        startsAt: institute.createdAt,
        endsAt: END_AT,
        externalReference:
          "legacy-migration-2026-10-01",
      });

    console.log(
      `✓ Created missing platform subscription: ${subscription._id}`,
    );
  } else {
    subscription.planId = plan._id;
    subscription.status = "active";
    subscription.endsAt = END_AT;

    if (!subscription.externalReference) {
      subscription.externalReference =
        "legacy-migration-2026-10-01";
    }

    await subscription.save();

    console.log(
      `✓ Updated existing platform subscription: ${subscription._id}`,
    );
  }

  // --------------------------------------------------
  // 9. FINAL RESULT
  // --------------------------------------------------

  console.log("\n--------------------------------------------------");
  console.log("MIGRATION RESULT");
  console.log("--------------------------------------------------");

  console.log(
    `Institute ID:       ${institute._id}`,
  );

  console.log(
    `Branch:             ${branch.name} (${branch.code})`,
  );

  console.log(
    `Branch ID:          ${branch._id}`,
  );

  console.log(
    `Default branch ID:  ${institute.defaultBranchId}`,
  );

  console.log(
    `Initial admin ID:   ${institute.initialAdminId}`,
  );

  console.log(
    `Admin email:        ${admin.email}`,
  );

  console.log(
    `Plan:               ${plan.name} (${plan.code})`,
  );

  console.log(
    `Subscription ID:    ${subscription._id}`,
  );

  console.log(
    `Subscription ends:  ${subscription.endsAt?.toISOString()}`,
  );

  console.log(
    `Institute expiry:   ${institute.expiryDate?.toISOString()}`,
  );

  console.log(
    `Linked staff users: ${scopedUsers.length}`,
  );

  console.log(
    "Existing student/staff/course records were NOT recreated or deleted.",
  );

  console.log("==================================================");
  console.log("MIGRATION COMPLETE");
  console.log("==================================================");
}

main()
  .catch((error) => {
    console.error(
      "\nMIGRATION FAILED — no further changes were attempted.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });