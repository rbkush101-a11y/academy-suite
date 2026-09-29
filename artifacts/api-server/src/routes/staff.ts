import { Router, type IRouter, type Request } from "express";
import bcrypt from "bcryptjs";

import { authenticate, authorize } from "../middlewares/auth";
import { Staff } from "../models/Staff";
import { User } from "../models/User";

const router: IRouter = Router();

type UserRequest = Request & {
  user?: {
    userId: string;
    email: string;
    role: string;
    instituteId?: string | null;
  };
};

function getLoggedInUser(req: UserRequest) {
  return req.user;
}

function getInstituteIdForUser(req: UserRequest): string | null {
  const user = getLoggedInUser(req);

  if (user?.role === "super_admin") {
    return null;
  }

  return user?.instituteId ? String(user.instituteId) : null;
}

// Portal UI roles and auth User roles are intentionally different.
// Keep the Staff form labels, but store only valid User.role values.
function mapPortalRoleToUserRole(
  accessLevel: string | undefined,
):
  | "institute_admin"
  | "teacher"
  | "accountant"
  | "staff" {
  switch (String(accessLevel || "staff").toLowerCase()) {
    case "admin":
      return "institute_admin";

    case "teacher":
      return "teacher";

    case "accountant":
      return "accountant";

    case "manager":
    case "receptionist":
    case "staff":
    default:
      return "staff";
  }
}

function getSubjectsTaught(staff: any): any[] {
  if (Array.isArray(staff.subjectsTaught)) {
    return staff.subjectsTaught;
  }

  const metadata = Array.isArray(staff.documents)
    ? staff.documents.find(
        (document: any) =>
          document.label === "__SYSTEM_SUBJECTS_TAUGHT__",
      )
    : null;

  if (!metadata?.name) {
    return [];
  }

  try {
    const parsed = JSON.parse(metadata.name);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatStaff(staff: any) {
  const empIdValue = staff.empId || staff.employeeId || "";

  return {
    id: String(staff._id),

    name: staff.name,
    firstName: staff.firstName ?? "",
    lastName: staff.lastName ?? "",

    email: staff.email ?? "",
    phone: staff.phone,
    homePhone: staff.homePhone ?? "",

    instituteId: staff.instituteId
      ? String(staff.instituteId)
      : null,

    // User ↔ Staff relation
    userId: staff.userId
      ? String(staff.userId)
      : null,

    role: staff.role,
    staffType: staff.staffType ?? "academic",
    positionTitle: staff.positionTitle ?? "",

    qualification: staff.qualification ?? "",
    subject: staff.subject ?? "",

    subjectsTaught: getSubjectsTaught(staff),

    batches: Array.isArray(staff.batches)
      ? staff.batches
      : [],

    experience: staff.experience ?? "",

    salary: staff.salary ?? 0,
    joinDate: staff.joinDate ?? "",
    status: staff.status ?? "active",

    employeeStatus: staff.employeeStatus ?? "",
    payRateType: staff.payRateType ?? "monthly",

    workTimingFrom: staff.workTimingFrom ?? "",
    workTimingTo: staff.workTimingTo ?? "",
    contractWorkDetail: staff.contractWorkDetail ?? "",

    gender: staff.gender ?? "",
    dateOfBirth: staff.dateOfBirth ?? "",

    // Address
    localAddress: staff.localAddress ?? "",
    localState: staff.localState ?? "",
    localDistrict: staff.localDistrict ?? "",
    localPin: staff.localPin ?? "",

    permanentAddress: staff.permanentAddress ?? "",
    permanentState: staff.permanentState ?? "",
    permanentDistrict: staff.permanentDistrict ?? "",
    permanentPin: staff.permanentPin ?? "",

    address: staff.address ?? "",

    // Identity & Bank
    aadhaarNumber: staff.aadhaarNumber ?? "",
    panNumber: staff.panNumber ?? "",
    bloodGroup: staff.bloodGroup ?? "",

    bankName: staff.bankName ?? "",
    bankBranch: staff.bankBranch ?? "",
    accountName: staff.accountName ?? "",
    accountNumber: staff.accountNumber ?? "",
    ifscCode: staff.ifscCode ?? "",
    upiId: staff.upiId ?? "",

    photoDataUrl: staff.photoDataUrl ?? "",

    documents: Array.isArray(staff.documents)
      ? staff.documents
      : [],

    // Employee Code
    empId: empIdValue,
    employeeId: empIdValue,

    // Portal Access
    loginEnabled: staff.loginEnabled ?? false,
    username: staff.username ?? "",
    accessLevel: staff.accessLevel ?? "staff",

    // Payroll
    employmentType:
      staff.employmentType ?? "full_time",

    monthlySalary:
      staff.monthlySalary ?? 0,

    perClassRate:
      staff.perClassRate ?? 0,

    baseSalary:
      staff.baseSalary ?? 0,

    hourlyRate:
      staff.hourlyRate ?? 0,

    pfDeduction:
      staff.pfDeduction ?? 12,

    tdsDeduction:
      staff.tdsDeduction ?? 0,

    createdAt: staff.createdAt
      ? staff.createdAt.toISOString()
      : new Date().toISOString(),
  };
}

function cleanBody(body: any) {
  const allowed = [
    "name",
    "firstName",
    "lastName",
    "email",
    "phone",
    "homePhone",

    "role",
    "staffType",
    "positionTitle",
    "qualification",
    "subject",
    "subjectsTaught",
    "batches",
    "experience",

    "salary",
    "joinDate",
    "status",
    "employeeStatus",
    "payRateType",

    "workTimingFrom",
    "workTimingTo",
    "contractWorkDetail",

    "gender",
    "dateOfBirth",

    "localAddress",
    "localState",
    "localDistrict",
    "localPin",

    "permanentAddress",
    "permanentState",
    "permanentDistrict",
    "permanentPin",

    "address",

    "aadhaarNumber",
    "panNumber",
    "bloodGroup",

    "bankName",
    "bankBranch",
    "accountName",
    "accountNumber",
    "ifscCode",
    "upiId",

    "photoDataUrl",
    "documents",

    "empId",
    "employeeId",

    "loginEnabled",
    "username",
    "accessLevel",

    "employmentType",
    "monthlySalary",
    "perClassRate",
    "baseSalary",
    "hourlyRate",
    "pfDeduction",
    "tdsDeduction",
  ];

  const data: Record<string, any> = {};

  for (const field of allowed) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  // Ensure empId & employeeId stay in sync.
  if (data.empId && !data.employeeId) {
    data.employeeId = data.empId;
  }

  if (data.employeeId && !data.empId) {
    data.empId = data.employeeId;
  }

  return data;
}


// ======================================================
// GET CURRENT TEACHER'S OWN STAFF RECORD
// ======================================================

router.get(
  "/staff/me",
  authenticate,
  async (req, res): Promise<void> => {
    try {
      const user = req.user!;

      const conditions: any[] = [];

      if (user.email) {
        conditions.push({
          email: user.email.toLowerCase().trim(),
        });
      }

      if ((user as any).loginId) {
        conditions.push({
          username: (user as any).loginId
            .toLowerCase()
            .trim(),
        });
      }

      if ((user as any).phone) {
        conditions.push({
          phone: String((user as any).phone),
        });
      }

      // New preferred lookup:
      // JWT User._id → Staff.userId
      if (user.userId) {
        const mongoose = await import("mongoose");

        if (mongoose.Types.ObjectId.isValid(user.userId)) {
          const instituteId =
            getInstituteIdForUser(req);

          const userIdQuery: any = {
            userId: new mongoose.Types.ObjectId(
              user.userId,
            ),
          };

          if (user.role !== "super_admin") {
            if (!instituteId) {
              res.status(403).json({
                error:
                  "Your account is not linked to an institute",
              });
              return;
            }

            userIdQuery.instituteId = instituteId;
          }

          const linkedStaff =
            await Staff.findOne(userIdQuery);

          if (linkedStaff) {
            res.json(formatStaff(linkedStaff));
            return;
          }
        }
      }

      if (conditions.length === 0) {
        res.status(400).json({
          error: "User identity info missing",
        });
        return;
      }

      const instituteId =
        getInstituteIdForUser(req);

      const staffQuery: any = {
        $or: conditions,
      };

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        staffQuery.instituteId = instituteId;
      }

      const staff =
        await Staff.findOne(staffQuery);

      if (!staff) {
        res.status(404).json({
          error: "Staff record not found",
        });
        return;
      }

      res.json(formatStaff(staff));
    } catch {
      res.status(500).json({
        error: "Unable to load staff profile",
      });
    }
  },
);


// ======================================================
// GET ALL STAFF
// ======================================================

router.get(
  "/staff",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
    "teacher",
  ),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {};

      const {
        staffType,
      } = req.query as {
        staffType?: string;
      };

      const user = getLoggedInUser(req);
      const instituteId =
        getInstituteIdForUser(req);

      if (user?.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      if (
        staffType === "academic" ||
        staffType === "computer"
      ) {
        filter.staffType = staffType;
      }

      const staff =
        await Staff.find(filter)
          .sort({ createdAt: -1 })
          .exec();

      res.json(staff.map(formatStaff));
    } catch {
      res.status(500).json({
        error: "Unable to load staff",
      });
    }
  },
);


// ======================================================
// CREATE STAFF
// ======================================================

router.post(
  "/staff",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);

      let instituteId =
        getInstituteIdForUser(req);

      if (user?.role === "super_admin") {
        instituteId = req.body.instituteId
          ? String(req.body.instituteId)
          : null;
      }

      if (!instituteId) {
        res.status(400).json({
          error:
            "instituteId is required to create staff",
        });
        return;
      }

      const data = cleanBody(req.body);

      const {
        loginEnabled,
        username,
        password,
        accessLevel,
      } = req.body;

      const portalEnabled =
        Boolean(loginEnabled);

      if (
        !data.name ||
        !data.phone ||
        !data.role ||
        data.salary === undefined ||
        !data.joinDate
      ) {
        res.status(400).json({
          error:
            "Name, mobile, role, salary and start date are required",
        });
        return;
      }

      if (
        data.staffType !== "academic" &&
        data.staffType !== "computer"
      ) {
        data.staffType = "academic";
      }

      let portalLoginId = "";

      let portalEmail = data.email
        ? String(data.email)
            .toLowerCase()
            .trim()
        : "";

      let portalUserRole:
        | "institute_admin"
        | "teacher"
        | "accountant"
        | "staff" = "staff";

      // ==================================================
      // PORTAL ACCOUNT VALIDATION
      // ==================================================

      if (portalEnabled) {
        portalLoginId = String(
          username || "",
        )
          .toLowerCase()
          .trim();

        if (
          !portalLoginId ||
          !String(password || "").trim()
        ) {
          res.status(400).json({
            error:
              "Portal username and password are required when portal access is enabled.",
          });
          return;
        }

        if (
          String(password).trim().length < 6
        ) {
          res.status(400).json({
            error:
              "Portal password must be at least 6 characters long.",
          });
          return;
        }

        if (!portalEmail) {
          portalEmail =
            `${portalLoginId}@institute.com`;
        }

        portalUserRole =
          mapPortalRoleToUserRole(
            accessLevel,
          );

        const [
          existingByLoginId,
          existingByEmail,
        ] = await Promise.all([
          User.findOne({
            loginId: portalLoginId,
          }),

          User.findOne({
            email: portalEmail,
          }),
        ]);

        if (existingByLoginId) {
          res.status(409).json({
            error:
              "This portal username is already in use.",
          });
          return;
        }

        if (existingByEmail) {
          res.status(409).json({
            error:
              "This email is already linked to another portal account.",
          });
          return;
        }
      }

      // ==================================================
      // AUTO-GENERATE EMPLOYEE ID
      // ==================================================

      if (!data.empId) {
        const count =
          await Staff.countDocuments({
            instituteId,
          });

        const nextNumber =
          count + 1;

        data.empId =
          `EMP-${String(nextNumber).padStart(3, "0")}`;

        data.employeeId =
          data.empId;
      }

      // ==================================================
      // CREATE STAFF FIRST
      // ==================================================

      const staff =
        await Staff.create({
          ...data,

          instituteId,

          loginEnabled:
            portalEnabled,

          username:
            portalLoginId,
        });

      // ==================================================
      // CREATE PORTAL USER + LINK USER TO STAFF
      // ==================================================

      if (portalEnabled) {
        const hashedPassword =
          await bcrypt.hash(
            String(password).trim(),
            10,
          );

        const createdUser =
          await User.create({
            name: data.name,

            email: portalEmail,

            loginId:
              portalLoginId,

            password:
              hashedPassword,

            role:
              portalUserRole,

            instituteId,

            isApproved: true,

            phone: data.phone,
          });

        // IMPORTANT:
        // User._id → Staff.userId
        staff.userId =
          createdUser._id;

        await staff.save();
      }

      res.status(201).json(
        formatStaff(staff),
      );
    } catch {
      res.status(500).json({
        error: "Unable to create staff",
      });
    }
  },
);


// ======================================================
// UPDATE STAFF
// ======================================================

router.patch(
  "/staff/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const filter: any = {
        _id: id,
      };

      const user =
        getLoggedInUser(req);

      const instituteId =
        getInstituteIdForUser(req);

      if (user?.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId =
          instituteId;
      }

      const oldStaff =
        await Staff.findOne(filter);

      if (!oldStaff) {
        res.status(404).json({
          error: "Staff not found",
        });
        return;
      }

      const updateData =
        cleanBody(req.body);

      // ==================================================
      // TEACHER OWN PROFILE RESTRICTION
      // ==================================================

      if (user?.role === "teacher") {
        let ownStaff = null;

        // Preferred secure lookup:
        // JWT User._id → Staff.userId
        if (user.userId) {
          const mongoose =
            await import("mongoose");

          if (
            mongoose.Types.ObjectId.isValid(
              user.userId,
            )
          ) {
            const ownStaffQuery: any = {
              userId:
                new mongoose.Types.ObjectId(
                  user.userId,
                ),
            };

            if (instituteId) {
              ownStaffQuery.instituteId =
                instituteId;
            }

            ownStaff =
              await Staff.findOne(
                ownStaffQuery,
              );
          }
        }

        // Legacy fallback for old staff records
        if (!ownStaff) {
          const ownConditions: any[] = [];

          if (user.email) {
            ownConditions.push({
              email:
                String(user.email)
                  .toLowerCase()
                  .trim(),
            });
          }

          if ((user as any).loginId) {
            ownConditions.push({
              username:
                String(
                  (user as any).loginId,
                )
                  .toLowerCase()
                  .trim(),
            });
          }

          if ((user as any).phone) {
            ownConditions.push({
              phone:
                String(
                  (user as any).phone,
                ),
            });
          }

          if (ownConditions.length) {
            const ownStaffQuery: any = {
              $or: ownConditions,
            };

            if (instituteId) {
              ownStaffQuery.instituteId =
                instituteId;
            }

            ownStaff =
              await Staff.findOne(
                ownStaffQuery,
              );
          }
        }

        if (
          !ownStaff ||
          String(ownStaff._id) !==
            String(id)
        ) {
          res.status(403).json({
            error:
              "Teachers can update only their own profile.",
          });
          return;
        }

        const lockedFields = [
          "empId",
          "employeeId",
          "role",
          "batches",
          "subject",
          "subjectsTaught",
          "joinDate",
          "workTimingFrom",
          "workTimingTo",
          "status",
          "employmentType",
          "salary",
          "monthlySalary",
          "perClassRate",
          "baseSalary",
          "hourlyRate",
          "pfDeduction",
          "tdsDeduction",
          "accessLevel",
        ];

        for (
          const field of lockedFields
        ) {
          delete updateData[field];
        }
      }

      // ==================================================
      // PORTAL SETTINGS
      // ==================================================

      const {
        loginEnabled,
        username,
        password,
        accessLevel,
      } = req.body;

      const portalEnabled =
        loginEnabled !== undefined
          ? Boolean(loginEnabled)
          : Boolean(
              oldStaff.loginEnabled,
            );

      if (portalEnabled) {
        const requestedLoginId =
          String(
            username ||
              oldStaff.username ||
              "",
          )
            .toLowerCase()
            .trim();

        if (!requestedLoginId) {
          res.status(400).json({
            error:
              "Portal username is required when portal access is enabled.",
          });
          return;
        }

        if (
          password !== undefined &&
          String(password).trim().length >
            0 &&
          String(password).trim().length <
            6
        ) {
          res.status(400).json({
            error:
              "Portal password must be at least 6 characters long.",
          });
          return;
        }
      }

      // ==================================================
      // PRESERVE EMPLOYEE ID
      // ==================================================

      if (
        !updateData.empId &&
        oldStaff.empId
      ) {
        updateData.empId =
          oldStaff.empId;

        updateData.employeeId =
          oldStaff.empId;
      }

      // ==================================================
      // UPDATE STAFF
      // ==================================================

      const updatedStaff =
        await Staff.findOneAndUpdate(
          filter,
          {
            ...updateData,

            loginEnabled:
              portalEnabled,

            username:
              username
                ? String(username)
                    .toLowerCase()
                    .trim()
                : oldStaff.username,
          },
          {
            new: true,
            runValidators: true,
          },
        );

      if (!updatedStaff) {
        res.status(404).json({
          error: "Staff not found",
        });
        return;
      }

      // ==================================================
      // FIND EXISTING USER
      // ==================================================

      const oldLoginId =
        oldStaff.username
          ? oldStaff.username
              .toLowerCase()
              .trim()
          : "";

      const oldEmail =
        oldStaff.email
          ? oldStaff.email
              .toLowerCase()
              .trim()
          : "";

      const activeUsername =
        String(
          username ||
            oldLoginId ||
            user?.email ||
            "",
        )
          .toLowerCase()
          .trim();

      const activeEmail =
        String(
          updatedStaff.email ||
            oldStaff.email ||
            `${activeUsername}@institute.com`,
        )
          .toLowerCase()
          .trim();

      let existingUser = null;

      // ==================================================
      // FIRST TRY DIRECT STAFF.userId
      // ==================================================

      if (oldStaff.userId) {
        existingUser =
          await User.findOne({
            _id: oldStaff.userId,
          });
      }

      // ==================================================
      // LEGACY FALLBACK
      // ==================================================

      if (!existingUser) {
        const searchUserFilter: any =
          oldLoginId
            ? {
                loginId:
                  oldLoginId,
              }
            : oldEmail
              ? {
                  email:
                    oldEmail,
                }
              : activeUsername
                ? {
                    loginId:
                      activeUsername,
                  }
                : null;

        if (
          searchUserFilter &&
          user?.role !== "super_admin"
        ) {
          searchUserFilter.instituteId =
            instituteId;
        }

        if (searchUserFilter) {
          existingUser =
            await User.findOne(
              searchUserFilter,
            );
        }
      }

      // ==================================================
      // USER PAYLOAD
      // ==================================================

      const userPayload: any = {
        name:
          updatedStaff.name,

        email:
          activeEmail,

        loginId:
          activeUsername,

        phone:
          updatedStaff.phone,

        instituteId:
          updatedStaff.instituteId ||
          oldStaff.instituteId,

        isApproved:
          portalEnabled,
      };

      if (
        accessLevel &&
        user?.role !== "teacher"
      ) {
        userPayload.role =
          mapPortalRoleToUserRole(
            accessLevel,
          );
      }

      if (
        password &&
        String(password).trim().length >
          0
      ) {
        userPayload.password =
          await bcrypt.hash(
            String(password).trim(),
            10,
          );
      }

      // ==================================================
      // ENABLE / CREATE PORTAL USER
      // ==================================================

      if (portalEnabled) {
        if (!activeUsername) {
          res.status(400).json({
            error:
              "Portal username is required when portal access is enabled.",
          });
          return;
        }

        // Check duplicate username/email
        const conflictingUser =
          await User.findOne({
            $or: [
              {
                loginId:
                  activeUsername,
              },
              {
                email:
                  activeEmail,
              },
            ],

            ...(existingUser?._id
              ? {
                  _id: {
                    $ne:
                      existingUser._id,
                  },
                }
              : {}),
          });

        if (conflictingUser) {
          res.status(409).json({
            error:
              "Portal username or email is already used by another account.",
          });
          return;
        }

        if (existingUser) {
          await User.findByIdAndUpdate(
            existingUser._id,
            userPayload,
            {
              runValidators: true,
            },
          );

          // Maintain User → Staff relation
          await Staff.findByIdAndUpdate(
            updatedStaff._id,
            {
              userId:
                existingUser._id,
            },
            {
              runValidators: true,
            },
          );
        } else {
          if (!userPayload.password) {
            res.status(400).json({
              error:
                "Password is required to create portal login for this staff member.",
            });
            return;
          }

          const createdUser =
            await User.create({
              ...userPayload,
              password:
                userPayload.password,
            });

          // IMPORTANT:
          // Newly-created User linked to Staff
          await Staff.findByIdAndUpdate(
            updatedStaff._id,
            {
              userId:
                createdUser._id,
            },
            {
              runValidators: true,
            },
          );
        }
      }

      // ==================================================
      // DISABLE PORTAL
      // ==================================================

      else if (existingUser) {
        // Keep User record.
        // Disable login instead of deleting account.
        await User.findByIdAndUpdate(
          existingUser._id,
          {
            isApproved: false,
          },
        );

        // Keep Staff.userId.
        // This is intentional so that when the portal
        // is enabled again, the same User account can
        // be re-used.
        if (
          !updatedStaff.userId
        ) {
          await Staff.findByIdAndUpdate(
            updatedStaff._id,
            {
              userId:
                existingUser._id,
            },
          );
        }
      }

      const finalStaff =
        await Staff.findById(
          updatedStaff._id,
        );

      res.json(
        formatStaff(
          finalStaff || updatedStaff,
        ),
      );
    } catch {
      res.status(500).json({
        error: "Unable to update staff",
      });
    }
  },
);


// ======================================================
// DELETE STAFF
// ======================================================

router.delete(
  "/staff/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const filter: any = {
        _id: id,
      };

      const user =
        getLoggedInUser(req);

      const instituteId =
        getInstituteIdForUser(req);

      if (user?.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId =
          instituteId;
      }

      const staff =
        await Staff.findOne(filter);

      if (!staff) {
        res.status(404).json({
          error: "Staff not found",
        });
        return;
      }

      // ==================================================
      // DELETE LINKED USER
      // ==================================================

      if (staff.userId) {
        const userFilter: any = {
          _id: staff.userId,
        };

        if (
          user?.role !== "super_admin"
        ) {
          userFilter.instituteId =
            instituteId;
        }

        await User.findOneAndDelete(
          userFilter,
        );
      } else if (staff.username) {
        // Legacy fallback
        const userFilter: any = {
          loginId:
            staff.username
              .toLowerCase()
              .trim(),
        };

        if (
          user?.role !== "super_admin"
        ) {
          userFilter.instituteId =
            instituteId;
        }

        await User.findOneAndDelete(
          userFilter,
        );
      } else if (staff.email) {
        // Legacy fallback
        const userFilter: any = {
          email:
            staff.email
              .toLowerCase()
              .trim(),
        };

        if (
          user?.role !== "super_admin"
        ) {
          userFilter.instituteId =
            instituteId;
        }

        await User.findOneAndDelete(
          userFilter,
        );
      }

      // ==================================================
      // DELETE STAFF
      // ==================================================

      await Staff.findByIdAndDelete(
        id,
      );

      res.sendStatus(204);
    } catch {
      res.status(500).json({
        error: "Unable to delete staff",
      });
    }
  },
);

export default router;