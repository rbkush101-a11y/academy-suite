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

const OLD_INSTITUTE_ID = "6a3a58c35606d0ac9f569973";
const OLD_INSTITUTE_NAME = "Second School Classes";

const OLD_BRANCH_NAME = "Preetam Nagar";
const OLD_BRANCH_CODE = "PN";

const NEW_INSTITUTE_ID = "6abe0a0bd9c50caf2e0cfc8c";
const NEW_INSTITUTE_NAME = "Second School Computer Classes";

function pass(message: string) {
  console.log(`✓ ${message}`);
}

function fail(message: string) {
  console.log(`✗ ${message}`);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  await mongoose.connect(mongoUri, {
    dbName: TARGET_DB,
  });

  console.log("==================================================");
  console.log("SECOND SCHOOL — UNIVERSAL_SAAS FINAL VERIFICATION");
  console.log("==================================================");

  console.log(`Database: ${mongoose.connection.name}`);

  if (mongoose.connection.name !== TARGET_DB) {
    throw new Error(
      `SAFETY FAILURE: Expected ${TARGET_DB}, connected to ${mongoose.connection.name}`,
    );
  }

  pass(`Connected to correct database: ${TARGET_DB}`);

  let errors = 0;

  // ==================================================
  // 1. OLD INSTITUTE
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("1. OLD INSTITUTE");
  console.log("--------------------------------------------------");

  const oldInstitute = await Institute.findById(
    OLD_INSTITUTE_ID,
  );

  if (!oldInstitute) {
    fail("Second School Classes institute NOT FOUND");
    errors++;
  } else {
    pass(
      `Institute found: ${oldInstitute.instituteName} (${oldInstitute._id})`,
    );

    if (oldInstitute.instituteName === OLD_INSTITUTE_NAME) {
      pass("Institute name is correct");
    } else {
      fail(
        `Institute name mismatch: ${oldInstitute.instituteName}`,
      );
      errors++;
    }
  }

  // ==================================================
  // 2. OLD INSTITUTE BRANCHES
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("2. OLD INSTITUTE BRANCH");
  console.log("--------------------------------------------------");

  const oldBranches = await Branch.find({
    instituteId: OLD_INSTITUTE_ID,
  });

  console.log(
    `Branches belonging to Second School Classes: ${oldBranches.length}`,
  );

  if (oldBranches.length === 1) {
    pass("Exactly 1 branch exists for old institute");
  } else {
    fail(
      `Expected exactly 1 old-institute branch, found ${oldBranches.length}`,
    );
    errors++;
  }

  const pnBranches = await Branch.find({
    instituteId: OLD_INSTITUTE_ID,
    code: OLD_BRANCH_CODE,
  });

  if (pnBranches.length === 1) {
    pass("Exactly 1 PN branch exists");

    const pnBranch = pnBranches[0];

    if (pnBranch.name === OLD_BRANCH_NAME) {
      pass("Branch name is Preetam Nagar");
    } else {
      fail(
        `Branch name mismatch: ${pnBranch.name}`,
      );
      errors++;
    }

    if (pnBranch.code === OLD_BRANCH_CODE) {
      pass("Branch code is PN");
    } else {
      fail(
        `Branch code mismatch: ${pnBranch.code}`,
      );
      errors++;
    }

    if (pnBranch.status === "active") {
      pass("PN branch is active");
    } else {
      fail(
        `PN branch status is ${pnBranch.status}`,
      );
      errors++;
    }

    if (pnBranch.isMain === true) {
      pass("PN branch is marked as main branch");
    } else {
      fail("PN branch is not marked as main");
      errors++;
    }

    if (
      oldInstitute &&
      String(oldInstitute.defaultBranchId) ===
        String(pnBranch._id)
    ) {
      pass("Institute defaultBranchId points to PN");
    } else {
      fail("Institute defaultBranchId does NOT point to PN");
      errors++;
    }
  } else {
    fail(
      `Expected exactly 1 PN branch, found ${pnBranches.length}`,
    );
    errors++;
  }

  // ==================================================
  // 3. OLD INSTITUTE ADMIN
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("3. OLD INSTITUTE ADMIN");
  console.log("--------------------------------------------------");

  const oldAdmins = await User.find({
    instituteId: OLD_INSTITUTE_ID,
    role: "institute_admin",
  });

  console.log(
    `Institute admins: ${oldAdmins.length}`,
  );

  if (oldAdmins.length === 1) {
    pass("Exactly 1 institute admin exists");

    const admin = oldAdmins[0];

    console.log(`Admin: ${admin.email}`);
    console.log(`Admin ID: ${admin._id}`);

    if (
      oldInstitute &&
      String(oldInstitute.initialAdminId) ===
        String(admin._id)
    ) {
      pass("Institute initialAdminId points to existing admin");
    } else {
      fail(
        "Institute initialAdminId does NOT point to admin",
      );
      errors++;
    }

    if (
      pnBranches.length === 1 &&
      String(admin.activeBranchId) ===
        String(pnBranches[0]._id)
    ) {
      pass("Admin activeBranchId points to PN");
    } else {
      fail("Admin activeBranchId does NOT point to PN");
      errors++;
    }

    if (
      pnBranches.length === 1 &&
      (admin.branchIds ?? [])
        .map(String)
        .includes(String(pnBranches[0]._id))
    ) {
      pass("Admin branchIds contains PN");
    } else {
      fail("Admin branchIds does NOT contain PN");
      errors++;
    }
  } else {
    fail(
      `Expected exactly 1 institute admin, found ${oldAdmins.length}`,
    );
    errors++;
  }

  // ==================================================
  // 4. TEACHER / STAFF USERS
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("4. TEACHER / STAFF USERS");
  console.log("--------------------------------------------------");

  const staffUsers = await User.find({
    instituteId: OLD_INSTITUTE_ID,
    role: {
      $in: [
        "teacher",
        "staff",
        "accountant",
      ],
    },
  });

  console.log(
    `Teacher/staff/accountant users: ${staffUsers.length}`,
  );

  let usersWithoutBranch = 0;

  for (const user of staffUsers) {
    const linked =
      pnBranches.length === 1 &&
      (user.branchIds ?? [])
        .map(String)
        .includes(String(pnBranches[0]._id));

    if (linked) {
      pass(`${user.email} → PN`);
    } else {
      fail(`${user.email} → PN NOT LINKED`);
      usersWithoutBranch++;
      errors++;
    }
  }

  if (usersWithoutBranch === 0) {
    pass("All teacher/staff/accountant users are linked to PN");
  }

  // ==================================================
  // 5. SUBSCRIPTION
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("5. PLATFORM SUBSCRIPTION");
  console.log("--------------------------------------------------");

  const subscriptions =
    await PlatformSubscription.find({
      instituteId: OLD_INSTITUTE_ID,
    });

  console.log(
    `Subscriptions for old institute: ${subscriptions.length}`,
  );

  if (subscriptions.length === 1) {
    pass("Exactly 1 subscription exists");

    const subscription = subscriptions[0];

    if (subscription.status === "active") {
      pass("Subscription status is active");
    } else {
      fail(
        `Subscription status is ${subscription.status}`,
      );
      errors++;
    }

    if (subscription.endsAt) {
      const expected =
        new Date("2026-10-10T18:29:59.999Z");

      if (
        subscription.endsAt.getTime() ===
        expected.getTime()
      ) {
        pass(
          "Subscription expiry is 10 October 2026 23:59:59 IST",
        );
      } else {
        fail(
          `Subscription expiry mismatch: ${subscription.endsAt.toISOString()}`,
        );
        errors++;
      }
    } else {
      fail("Subscription has no endsAt");
      errors++;
    }

    const plan = await PlatformPlan.findById(
      subscription.planId,
    );

    if (plan) {
      console.log(
        `Subscription plan: ${plan.name} (${plan.code})`,
      );

      if (plan.code === "starter") {
        pass("Subscription uses Starter plan");
      } else {
        fail(
          `Expected starter plan, found ${plan.code}`,
        );
        errors++;
      }
    } else {
      fail("Subscription plan was not found");
      errors++;
    }
  } else {
    fail(
      `Expected exactly 1 subscription, found ${subscriptions.length}`,
    );
    errors++;
  }

  // ==================================================
  // 6. NEW INSTITUTE
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("6. NEW INSTITUTE");
  console.log("--------------------------------------------------");

  const newInstitute = await Institute.findById(
    NEW_INSTITUTE_ID,
  );

  if (!newInstitute) {
    fail("Second School Computer Classes NOT FOUND");
    errors++;
  } else {
    pass(
      `New institute preserved: ${newInstitute.instituteName}`,
    );

    if (
      newInstitute.instituteName ===
      NEW_INSTITUTE_NAME
    ) {
      pass("New institute name is correct");
    } else {
      fail(
        `New institute name mismatch: ${newInstitute.instituteName}`,
      );
      errors++;
    }

    const newBranches = await Branch.find({
      instituteId: newInstitute._id,
    });

    if (newBranches.length === 1) {
      pass("New institute still has exactly 1 branch");

      const mainBranch = newBranches[0];

      console.log(
        `New branch: ${mainBranch.name} (${mainBranch.code})`,
      );

      if (mainBranch.code === "MAIN") {
        pass("New institute MAIN branch preserved");
      } else {
        fail(
          `New institute branch code is ${mainBranch.code}`,
        );
        errors++;
      }
    } else {
      fail(
        `Expected 1 new-institute branch, found ${newBranches.length}`,
      );
      errors++;
    }
  }

  // ==================================================
  // 7. GLOBAL DUPLICATE CHECK
  // ==================================================

  console.log("\n--------------------------------------------------");
  console.log("7. DUPLICATE CHECK");
  console.log("--------------------------------------------------");

  const allPnBranches = await Branch.find({
    code: OLD_BRANCH_CODE,
  });

  console.log(
    `Total PN branches in database: ${allPnBranches.length}`,
  );

  if (allPnBranches.length === 1) {
    pass("No duplicate PN branch found");
  } else {
    fail(
      `Expected exactly 1 PN branch globally, found ${allPnBranches.length}`,
    );
    errors++;
  }

  const instituteNameMatches =
    await Institute.find({
      instituteName: OLD_INSTITUTE_NAME,
    });

  console.log(
    `Total '${OLD_INSTITUTE_NAME}' institutes: ${instituteNameMatches.length}`,
  );

  if (instituteNameMatches.length === 1) {
    pass("No duplicate Second School Classes institute found");
  } else {
    fail(
      `Expected exactly 1 Second School Classes institute, found ${instituteNameMatches.length}`,
    );
    errors++;
  }

  // ==================================================
  // FINAL RESULT
  // ==================================================

  console.log("\n==================================================");
  console.log("FINAL VERIFICATION RESULT");
  console.log("==================================================");

  if (errors === 0) {
    console.log("✓ ALL CHECKS PASSED");
    console.log("✓ universal_saas migration is structurally correct");
    console.log("✓ Legacy institute is linked to Preetam Nagar");
    console.log("✓ Existing admin is linked correctly");
    console.log("✓ Subscription is configured correctly");
    console.log("✓ New institute remains preserved");
    console.log("✓ No duplicate institute detected");
    console.log("✓ No duplicate PN branch detected");
  } else {
    console.log(`✗ VERIFICATION FAILED: ${errors} issue(s) found`);
    process.exitCode = 1;
  }

  console.log("==================================================");
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION SCRIPT FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });