import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { authenticate } from "../middlewares/auth";
import { recordAudit } from "../lib/foundation";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { StudentAttendance } from "../models/Attendance";
import { Payment } from "../models/Finance";
import { Homework } from "../models/Homework";
import { Subject } from "../models/Subject";
import { Exam, ExamMark } from "../models/Exam";
import { Timetable } from "../models/Timetable";
import { Staff } from "../models/Staff";
import { Institute } from "../models/Institute";
import { ParentFamily } from "../models/ParentFamily";
import { Student } from "../models/Student";
import { User } from "../models/User";
import { UserSession } from "../models/UserSession";

const router: IRouter = Router();

const text = (value: unknown) => String(value ?? "").trim();
const normalizeName = (value: unknown) => text(value).toLowerCase().replace(/\s+/g, " ");
const normalizePhone = (value: unknown) => text(value).replace(/\D/g, "").slice(-10);
const idOf = (value: unknown) => (value ? String(value) : "");

const currentIndiaMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
};

function requireParent(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please login to continue." });
    return;
  }
  if (req.user.role !== "parent") {
    res.status(403).json({ error: "Parent account required." });
    return;
  }
  next();
}

function requireParentAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please login to continue." });
    return;
  }
  if (!["super_admin", "institute_admin"].includes(req.user.role)) {
    res.status(403).json({ error: "Only institute administrators can manage parent families." });
    return;
  }
  next();
}

function adminInstituteId(req: Request, res: Response): Types.ObjectId | null {
  const raw = req.user?.role === "super_admin"
    ? text(req.query.instituteId || req.body?.instituteId || req.user?.instituteId)
    : text(req.user?.instituteId);

  if (!raw || !Types.ObjectId.isValid(raw)) {
    res.status(400).json({ error: "Select a valid institute first." });
    return null;
  }
  return new Types.ObjectId(raw);
}

function identityMatches(
  family: { fatherName?: string; fatherPhone?: string; motherName?: string; motherPhone?: string },
  student: any,
): boolean {
  const familyFatherPhone = normalizePhone(family.fatherPhone);
  const studentFatherPhone = normalizePhone(student.fatherPhone || student.parentPhone);
  if (familyFatherPhone && studentFatherPhone && familyFatherPhone === studentFatherPhone) return true;

  const familyMotherPhone = normalizePhone(family.motherPhone);
  const studentMotherPhone = normalizePhone(student.motherPhone);
  if (familyMotherPhone && studentMotherPhone && familyMotherPhone === studentMotherPhone) return true;

  const familyFatherName = normalizeName(family.fatherName);
  const studentFatherName = normalizeName(student.fatherName || student.parentName);
  if (familyFatherName && studentFatherName && familyFatherName === studentFatherName) return true;

  const familyMotherName = normalizeName(family.motherName);
  const studentMotherName = normalizeName(student.motherName);
  if (familyMotherName && studentMotherName && familyMotherName === studentMotherName) return true;

  return false;
}

async function ensureFamilies(instituteId: Types.ObjectId): Promise<void> {
  const [students, families] = await Promise.all([
    Student.find({ instituteId, status: { $ne: "inactive" } })
      .select("fatherName fatherPhone parentName parentPhone motherName motherPhone")
      .sort({ createdAt: 1 })
      .lean(),
    ParentFamily.find({ instituteId }).sort({ createdAt: 1 }),
  ]);

  const assigned = new Set(
    families.flatMap((family) => (family.studentIds ?? []).map((id) => String(id))),
  );

  for (const student of students as any[]) {
    const studentId = String(student._id);
    if (assigned.has(studentId)) continue;

    let family = families.find((candidate) => identityMatches(candidate, student));

    if (!family) {
      family = await ParentFamily.create({
        instituteId,
        fatherName: text(student.fatherName || student.parentName),
        fatherPhone: text(student.fatherPhone || student.parentPhone),
        motherName: text(student.motherName),
        motherPhone: text(student.motherPhone),
        studentIds: [student._id],
      });
      families.push(family);
    } else {
      if (!family.studentIds.some((id) => String(id) === studentId)) {
        family.studentIds.push(student._id);
      }
      if (!family.fatherName) family.fatherName = text(student.fatherName || student.parentName);
      if (!family.fatherPhone) family.fatherPhone = text(student.fatherPhone || student.parentPhone);
      if (!family.motherName) family.motherName = text(student.motherName);
      if (!family.motherPhone) family.motherPhone = text(student.motherPhone);
      await family.save();
    }

    assigned.add(studentId);
  }
}


async function attachLegacyParentToFamily(parent: any): Promise<any> {
  if (!parent?.instituteId) return parent;
  if (parent.parentFamilyId) return parent;

  await ensureFamilies(parent.instituteId);
  const families = await ParentFamily.find({ instituteId: parent.instituteId });
  const parentPhone = normalizePhone(parent.phone);
  const parentName = normalizeName(parent.name);

  let matchedFamily: any = null;
  let relation: "father" | "mother" | null = null;

  for (const family of families) {
    const fatherPhoneMatch = parentPhone && normalizePhone(family.fatherPhone) === parentPhone;
    const motherPhoneMatch = parentPhone && normalizePhone(family.motherPhone) === parentPhone;
    const fatherNameMatch = parentName && normalizeName(family.fatherName) === parentName;
    const motherNameMatch = parentName && normalizeName(family.motherName) === parentName;

    if (parent.parentRelation === "father" && (fatherPhoneMatch || fatherNameMatch)) {
      matchedFamily = family; relation = "father"; break;
    }
    if (parent.parentRelation === "mother" && (motherPhoneMatch || motherNameMatch)) {
      matchedFamily = family; relation = "mother"; break;
    }
    if (fatherPhoneMatch || fatherNameMatch) {
      matchedFamily = family; relation = "father"; break;
    }
    if (motherPhoneMatch || motherNameMatch) {
      matchedFamily = family; relation = "mother"; break;
    }
  }

  if (!matchedFamily || !relation) return parent;

  parent.parentFamilyId = matchedFamily._id;
  parent.parentRelation = relation;
  parent.linkedStudentIds = matchedFamily.studentIds;
  await parent.save();
  return parent;
}

async function getParentAccount(userId: string) {
  return User.findById(userId).select(
    "name email loginId phone logoDataUrl role instituteId isApproved linkedStudentIds parentFamilyId parentRelation",
  );
}

async function linkedStudentIdsForParent(parent: any): Promise<string[]> {
  const ids = new Set<string>(
    (parent?.linkedStudentIds ?? [])
      .map((id: unknown) => String(id ?? "").trim())
      .filter(Boolean),
  );

  if (!parent?.instituteId) return [...ids];

  const parentPhone = normalizePhone(parent.phone);
  const parentName = normalizeName(parent.name);
  const relation = text(parent.parentRelation).toLowerCase();

  const matchesParent = (family: any): boolean => {
    const fatherPhoneMatch = Boolean(parentPhone) && normalizePhone(family.fatherPhone) === parentPhone;
    const motherPhoneMatch = Boolean(parentPhone) && normalizePhone(family.motherPhone) === parentPhone;
    const fatherNameMatch = Boolean(parentName) && normalizeName(family.fatherName) === parentName;
    const motherNameMatch = Boolean(parentName) && normalizeName(family.motherName) === parentName;

    if (relation === "father") return fatherPhoneMatch || fatherNameMatch;
    if (relation === "mother") return motherPhoneMatch || motherNameMatch;
    return fatherPhoneMatch || motherPhoneMatch || fatherNameMatch || motherNameMatch;
  };

  // Existing projects can contain an older one-child ParentFamily plus a newer
  // sibling family. Read every matching family for this parent and merge the
  // exact Student IDs into one canonical family.
  const allFamilies = await ParentFamily.find({ instituteId: parent.instituteId });
  const currentFamilyId = idOf(parent.parentFamilyId);
  const currentFamily = currentFamilyId
    ? allFamilies.find((family) => String(family._id) === currentFamilyId) ?? null
    : null;

  const matchingFamilies = allFamilies.filter((family) => matchesParent(family));
  const canonicalFamily = currentFamily && matchesParent(currentFamily)
    ? currentFamily
    : matchingFamilies[0] ?? currentFamily ?? null;

  for (const family of matchingFamilies) {
    for (const id of family.studentIds ?? []) ids.add(String(id));
  }
  if (currentFamily) {
    for (const id of currentFamily.studentIds ?? []) ids.add(String(id));
  }

  if (canonicalFamily) {
    // Discover siblings from Student records once, then persist exact IDs. This
    // also repairs old family documents where only one sibling had been saved.
    const students = await Student.find({
      instituteId: parent.instituteId,
      status: { $ne: "inactive" },
    })
      .select("_id fatherName fatherPhone parentName parentPhone motherName motherPhone")
      .lean();

    for (const student of students as any[]) {
      if (identityMatches(canonicalFamily, student)) ids.add(String(student._id));
    }

    const mergedIds = [...ids].filter((id) => Types.ObjectId.isValid(id));
    const currentIds = (canonicalFamily.studentIds ?? []).map((id: unknown) => String(id));
    const familyChanged =
      mergedIds.length !== currentIds.length ||
      mergedIds.some((id) => !currentIds.includes(id));

    if (familyChanged) {
      canonicalFamily.studentIds = mergedIds.map((id) => new Types.ObjectId(id));
      await canonicalFamily.save();
    }

    const accountChanged =
      idOf(parent.parentFamilyId) !== String(canonicalFamily._id) ||
      mergedIds.length !== (parent.linkedStudentIds ?? []).length ||
      mergedIds.some((id) => !(parent.linkedStudentIds ?? []).some((saved: unknown) => String(saved) === id));

    if (accountChanged) {
      parent.parentFamilyId = canonicalFamily._id;
      parent.linkedStudentIds = mergedIds.map((id) => new Types.ObjectId(id));
      await parent.save();
    }

    await User.updateMany(
      { instituteId: parent.instituteId, role: "parent", parentFamilyId: canonicalFamily._id },
      { $set: { linkedStudentIds: canonicalFamily.studentIds } },
    );
  }

  return [...ids];
}

router.get(
  "/parents/families",
  authenticate,
  requireParentAdmin,
  async (req, res): Promise<void> => {
    try {
      const instituteId = adminInstituteId(req, res);
      if (!instituteId) return;

      await ensureFamilies(instituteId);

      const legacyParents = await User.find({ instituteId, role: "parent", parentFamilyId: { $exists: false } }).select("name phone instituteId parentRelation linkedStudentIds parentFamilyId");
      for (const legacyParent of legacyParents) await attachLegacyParentToFamily(legacyParent);

      const [families, students, parentUsers, batches] = await Promise.all([
        ParentFamily.find({ instituteId }).sort({ updatedAt: -1 }).lean(),
        Student.find({ instituteId })
          .select(
            "name enrollmentNo className section academicYear photoDataUrl status batchId fatherName fatherPhone parentName parentPhone motherName motherPhone",
          )
          .sort({ name: 1 })
          .lean(),
        User.find({ instituteId, role: "parent" })
          .select("name email loginId phone role isApproved linkedStudentIds parentFamilyId parentRelation")
          .lean(),
        Batch.find({ instituteId }).select("name").lean(),
      ]);

      const batchById = new Map(batches.map((batch) => [String(batch._id), batch.name]));
      const studentById = new Map((students as any[]).map((student) => [String(student._id), student]));
      const usersByFamily = new Map<string, any[]>();
      for (const user of parentUsers as any[]) {
        const familyId = idOf(user.parentFamilyId);
        if (!familyId) continue;
        const list = usersByFamily.get(familyId) ?? [];
        list.push(user);
        usersByFamily.set(familyId, list);
      }

      const formattedFamilies = (families as any[]).map((family) => {
        const accounts = usersByFamily.get(String(family._id)) ?? [];
        const familyAccount =
          accounts.find((account) => account.parentRelation === "guardian") ??
          accounts.find((account) => account.isApproved === true) ??
          accounts[0] ??
          null;

        const children = (family.studentIds ?? [])
          .map((studentId: unknown) => studentById.get(String(studentId)))
          .filter(Boolean)
          .map((student: any) => ({
            id: String(student._id),
            name: student.name ?? "",
            enrollmentNo: student.enrollmentNo ?? "",
            className: student.className ?? "",
            section: student.section ?? "",
            academicYear: student.academicYear ?? "",
            status: student.status ?? "active",
            photoDataUrl: student.photoDataUrl ?? "",
            batchName: student.batchId ? batchById.get(String(student.batchId)) ?? "" : "",
          }));

        const accountShape = (account: any) => account ? {
          id: String(account._id),
          name: account.name ?? "",
          loginId: account.loginId ?? account.email ?? "",
          email: account.email ?? "",
          phone: account.phone ?? "",
          isApproved: Boolean(account.isApproved),
        } : null;

        return {
          id: String(family._id),
          father: {
            name: family.fatherName ?? "",
            phone: family.fatherPhone ?? "",
          },
          mother: {
            name: family.motherName ?? "",
            phone: family.motherPhone ?? "",
          },
          account: accountShape(familyAccount),
          children,
        };
      });

      const allStudents = (students as any[]).map((student) => ({
        id: String(student._id),
        name: student.name ?? "",
        enrollmentNo: student.enrollmentNo ?? "",
        className: student.className ?? "",
        section: student.section ?? "",
        status: student.status ?? "active",
        batchName: student.batchId ? batchById.get(String(student.batchId)) ?? "" : "",
      }));

      res.json({ families: formattedFamilies, students: allStudents });
    } catch (error) {
      console.error("Parent families load error:", error);
      res.status(500).json({ error: "Unable to load parent families." });
    }
  },
);

router.put(
  "/parents/families/:familyId/children",
  authenticate,
  requireParentAdmin,
  async (req, res): Promise<void> => {
    try {
      const instituteId = adminInstituteId(req, res);
      if (!instituteId) return;
      const familyId = text(req.params.familyId);
      if (!Types.ObjectId.isValid(familyId)) {
        res.status(400).json({ error: "Invalid family." });
        return;
      }

      const rawIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds.map(String) : [];
      const studentIds = [...new Set(rawIds.filter((id: string) => Types.ObjectId.isValid(id)))];
      if (!studentIds.length) {
        res.status(400).json({ error: "Link at least one child to this family." });
        return;
      }

      const studentObjectIds = studentIds.map((id: string) => new Types.ObjectId(id));
      const students = await Student.find({ _id: { $in: studentObjectIds }, instituteId }).select("_id");
      if (students.length !== studentIds.length) {
        res.status(400).json({ error: "One or more selected students are invalid." });
        return;
      }

      const family = await ParentFamily.findOne({ _id: familyId, instituteId });
      if (!family) {
        res.status(404).json({ error: "Family not found." });
        return;
      }

      // A student belongs to only one family card. Moving a student automatically removes it from another family.
      await ParentFamily.updateMany(
        { instituteId, _id: { $ne: family._id }, studentIds: { $in: studentObjectIds } },
        { $pull: { studentIds: { $in: studentObjectIds } } } as any,
      );

      family.studentIds = students.map((student) => student._id);
      await family.save();

      await User.updateMany(
        { instituteId, role: "parent", parentFamilyId: family._id },
        { $set: { linkedStudentIds: family.studentIds } },
      );

      await recordAudit(req, "parent.family.children.update", "parent_family", String(family._id), {
        studentIds,
      });

      res.json({ success: true, linkedStudentIds: family.studentIds.map(String) });
    } catch (error) {
      console.error("Parent family children update error:", error);
      res.status(500).json({ error: "Unable to update linked children." });
    }
  },
);

router.post(
  "/parents/families/:familyId/login",
  authenticate,
  requireParentAdmin,
  async (req, res): Promise<void> => {
    try {
      const instituteId = adminInstituteId(req, res);
      if (!instituteId) return;

      const familyId = text(req.params.familyId);
      if (!Types.ObjectId.isValid(familyId)) {
        res.status(400).json({ error: "Select a valid family." });
        return;
      }

      const family = await ParentFamily.findOne({
        _id: familyId,
        instituteId,
      });

      if (!family) {
        res.status(404).json({ error: "Family not found." });
        return;
      }

      const fatherName = text(family.fatherName);
      const motherName = text(family.motherName);
      const fatherPhone = text(family.fatherPhone);
      const motherPhone = text(family.motherPhone);

      const familyName =
        fatherName && motherName
          ? `${fatherName} & ${motherName}`
          : fatherName || motherName || "Parent Family";

      const primaryPhone =
        fatherPhone || motherPhone;

      if (!primaryPhone) {
        res.status(400).json({
          error:
            "Add at least one parent phone number in the student record first.",
        });
        return;
      }

      const email =
        text(
          req.body?.email ||
            req.body?.loginId,
        ).toLowerCase();

      const password =
        text(req.body?.password);

      const isApproved =
        req.body?.isApproved !== false;

      if (
        !email ||
        !/^\S+@\S+\.\S+$/.test(email)
      ) {
        res.status(400).json({
          error:
            "Enter a valid family login email address.",
        });
        return;
      }

      if (
        password &&
        (
          password.length < 8 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/\d/.test(password)
        )
      ) {
        res.status(400).json({
          error:
            "Password must have 8+ characters, uppercase, lowercase and a number.",
        });
        return;
      }

      const familyAccounts =
        await User.find({
          instituteId,
          role: "parent",
          parentFamilyId:
            family._id,
        }).sort({ createdAt: 1 });

      let user =
        familyAccounts.find(
          (account) =>
            String(account.email ?? "")
              .trim()
              .toLowerCase() === email ||
            String(account.loginId ?? "")
              .trim()
              .toLowerCase() === email,
        ) ??
        familyAccounts.find(
          (account) =>
            account.parentRelation ===
            "guardian",
        ) ??
        familyAccounts.find(
          (account) =>
            account.isApproved === true,
        ) ??
        familyAccounts[0] ??
        null;

      const familyAccountIds =
        familyAccounts.map(
          (account) => account._id,
        );

      const duplicateEmail =
        await User.exists({
          ...(familyAccountIds.length
            ? {
                _id: {
                  $nin:
                    familyAccountIds,
                },
              }
            : {}),
          $or: [
            { email },
            { loginId: email },
          ],
        });

      if (duplicateEmail) {
        res.status(409).json({
          error:
            "That email address is already being used by another account.",
        });
        return;
      }

      if (!user) {
        if (!password) {
          res.status(400).json({
            error:
              "Password is required when creating the family login.",
          });
          return;
        }

        user = await User.create({
          name: familyName,
          email,
          loginId: email,
          phone: primaryPhone,
          password:
            await bcrypt.hash(
              password,
              12,
            ),
          role: "parent",
          instituteId,
          isApproved,
          parentFamilyId:
            family._id,
          parentRelation:
            "guardian",
          linkedStudentIds:
            family.studentIds,
        });
      } else {
        user.name = familyName;
        user.email = email;
        user.loginId = email;
        user.phone = primaryPhone;
        user.isApproved =
          isApproved;
        user.parentFamilyId =
          family._id;
        user.parentRelation =
          "guardian";
        user.linkedStudentIds =
          family.studentIds;

        if (password) {
          user.password =
            await bcrypt.hash(
              password,
              12,
            );
        }

        await user.save();
      }

      const extraAccountIds =
        familyAccounts
          .filter(
            (account) =>
              String(account._id) !==
              String(user!._id),
          )
          .map(
            (account) =>
              account._id,
          );

      if (
        extraAccountIds.length
      ) {
        await User.updateMany(
          {
            _id: {
              $in:
                extraAccountIds,
            },
          },
          {
            $set: {
              isApproved: false,
            },
          },
        );
      }

      const sessionUserIds = [
        String(user._id),
        ...extraAccountIds.map(String),
      ];

      await UserSession.updateMany(
        {
          userId: {
            $in:
              sessionUserIds,
          },
          principalType:
            "user",
          revokedAt: null,
        },
        {
          $set: {
            revokedAt:
              new Date(),
            revokeReason:
              "family_parent_account_updated",
          },
        },
      );

      await recordAudit(
        req,
        "parent.family.login.upsert",
        "user",
        String(user._id),
        {
          familyId:
            String(family._id),
          fatherPhone:
            Boolean(fatherPhone),
          motherPhone:
            Boolean(motherPhone),
          linkedStudentIds:
            family.studentIds.map(
              String,
            ),
          disabledLegacyAccounts:
            extraAccountIds.map(
              String,
            ),
        },
      );

      res.json({
        account: {
          id:
            String(user._id),
          name:
            user.name,
          loginId:
            user.loginId ??
            user.email,
          email:
            user.email ?? "",
          phone:
            user.phone ?? "",
          isApproved:
            Boolean(
              user.isApproved,
            ),
        },
        loginAliases: {
          email:
            user.email,
          fatherPhone,
          motherPhone,
        },
      });
    } catch (error: any) {
      if (
        error?.code === 11000
      ) {
        res.status(409).json({
          error:
            "That email address is already being used.",
        });
        return;
      }

      console.error(
        "Family parent login upsert error:",
        error,
      );

      res.status(500).json({
        error:
          "Unable to save family login.",
      });
    }
  },
);

router.get(
  "/parent/overview",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      let parent = await getParentAccount(req.user!.userId);
      if (!parent) {
        res.status(404).json({ error: "Parent account not found." });
        return;
      }
      if (!parent.isApproved) {
        res.status(403).json({ error: "Parent account is inactive." });
        return;
      }
      if (!parent.instituteId) {
        res.status(400).json({ error: "Parent account is not linked to an institute." });
        return;
      }

      const resolvedParent = await attachLegacyParentToFamily(parent);
      if (!resolvedParent?.instituteId) {
        res.status(400).json({ error: "Parent account is not linked to an institute." });
        return;
      }

      const instituteId = String(resolvedParent.instituteId);
      const childIds = await linkedStudentIdsForParent(resolvedParent);

      const [institute, students] = await Promise.all([
        Institute.findById(resolvedParent.instituteId)
          .select("instituteName logoDataUrl academicYear phone email address city state")
          .lean(),
        childIds.length
          ? Student.find({
              _id: { $in: childIds },
              instituteId: resolvedParent.instituteId,
              status: { $ne: "inactive" },
            })
              .select(
                "name email phone enrollmentNo instituteId batchId courseId status academicYear dateOfBirth gender genderOther bloodGroup schoolName className section board boardOther lastClassPercentage lastClassMarks photoDataUrl documents aadhaarCard previousMarksheet parentName parentPhone motherName motherOccupation motherPhone motherWhatsapp fatherName fatherOccupation fatherPhone fatherWhatsapp emergencyPhone correspondenceAddress correspondenceDistrict correspondenceState correspondencePin permanentAddress permanentDistrict permanentState permanentPin",
              )
              .lean()
          : Promise.resolve([]),
      ]);

      const instituteInfo = {
        id: institute ? idOf(institute._id) : instituteId,
        name: institute?.instituteName ?? "Institute",
        logoDataUrl: institute?.logoDataUrl ?? "",
        academicYear: institute?.academicYear ?? "",
        phone: institute?.phone ?? "",
        email: institute?.email ?? "",
        address: [institute?.address, institute?.city, institute?.state]
          .filter(Boolean)
          .join(", "),
      };

      const order = new Map(childIds.map((id, index) => [id, index]));
      (students as any[]).sort(
        (a, b) =>
          (order.get(String(a._id)) ?? 999) -
          (order.get(String(b._id)) ?? 999),
      );

      if (!(students as any[]).length) {
        res.json({
          institute: instituteInfo,
          parent: {
            id: idOf(resolvedParent._id),
            name: resolvedParent.name,
            email: resolvedParent.email ?? "",
            phone: resolvedParent.phone ?? "",
            photoDataUrl: resolvedParent.logoDataUrl ?? "",
          },
          children: [],
          selectedChild: null,
          attendance: {
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
            percentage: 0,
            recent: [],
          },
          fees: {
            paid: 0,
            pending: 0,
            overdue: 0,
            outstanding: 0,
            collectionRate: 0,
            recent: [],
          },
          homework: [],
          exams: [],
          timetable: [],
          teachers: [],
          message: "No active student is linked to this parent account yet.",
        });
        return;
      }

      const requestedStudentId = text(req.query.studentId);
      const selected = requestedStudentId
        ? (students as any[]).find(
            (student) => idOf(student._id) === requestedStudentId,
          )
        : (students as any[])[0];

      if (!selected) {
        res.status(403).json({
          error: "This student is not linked to your parent account or is inactive.",
        });
        return;
      }

      const studentId = idOf(selected._id);
      const month = /^\d{4}-\d{2}$/.test(text(req.query.month))
        ? text(req.query.month)
        : currentIndiaMonth();

      const allCourseIds = [
        ...new Set(
          (students as any[])
            .map((student) => idOf(student.courseId))
            .filter(Boolean),
        ),
      ];
      const allBatchIds = [
        ...new Set(
          (students as any[])
            .map((student) => idOf(student.batchId))
            .filter(Boolean),
        ),
      ];

      const [
        courses,
        batches,
        attendanceRows,
        payments,
        homeworkRows,
        exams,
        timetableRows,
      ] = await Promise.all([
        allCourseIds.length
          ? Course.find({ _id: { $in: allCourseIds } }).select("name").lean()
          : Promise.resolve([]),
        allBatchIds.length
          ? Batch.find({ _id: { $in: allBatchIds } })
              .select("name schedule academicYear")
              .lean()
          : Promise.resolve([]),
        StudentAttendance.find({
          studentId: selected._id,
          date: new RegExp(`^${month}`),
        })
          .sort({ date: -1 })
          .lean(),
        Payment.find({ studentId: selected._id, instituteId: resolvedParent.instituteId })
          .sort({ dueDate: -1 })
          .limit(24)
          .lean(),
        selected.batchId
          ? Homework.find({ batchId: selected.batchId })
              .sort({ dueDate: 1, createdAt: -1 })
              .limit(30)
              .lean()
          : Promise.resolve([]),
        selected.batchId
          ? Exam.find({ batchId: selected.batchId })
              .sort({ date: -1 })
              .limit(30)
              .lean()
          : Promise.resolve([]),
        selected.batchId
          ? Timetable.find({ batchId: selected.batchId })
              .sort({ day: 1, startTime: 1 })
              .lean()
          : Promise.resolve([]),
      ]);

      const courseById = new Map(
        (courses as any[]).map((course) => [idOf(course._id), course.name]),
      );
      const batchById = new Map(
        (batches as any[]).map((batch) => [idOf(batch._id), batch]),
      );

      const subjectIds = [
        ...new Set(
          [
            ...(homeworkRows as any[]).map((row) => idOf(row.subjectId)),
            ...(exams as any[]).map((row) => idOf(row.subjectId)),
            ...(timetableRows as any[]).map((row) => idOf(row.subjectId)),
          ].filter(Boolean),
        ),
      ];

      const teacherIds = [
        ...new Set(
          (timetableRows as any[])
            .map((row) => idOf(row.teacherId))
            .filter(Boolean),
        ),
      ];

      const [subjects, teachers] = await Promise.all([
        subjectIds.length
          ? Subject.find({ _id: { $in: subjectIds } }).select("name").lean()
          : Promise.resolve([]),
        teacherIds.length
          ? Staff.find({
              _id: { $in: teacherIds },
              instituteId: resolvedParent.instituteId,
            })
              .select("name photoDataUrl positionTitle subject")
              .lean()
          : Promise.resolve([]),
      ]);

      const subjectById = new Map(
        (subjects as any[]).map((subject) => [idOf(subject._id), subject.name]),
      );
      const teacherById = new Map(
        (teachers as any[]).map((teacher) => [idOf(teacher._id), teacher]),
      );

      const examIds = (exams as any[]).map((exam) => exam._id);
      const marks = examIds.length
        ? await ExamMark.find({
            studentId: selected._id,
            examId: { $in: examIds },
          }).lean()
        : [];
      const markByExam = new Map(
        (marks as any[]).map((mark) => [idOf(mark.examId), mark]),
      );

      const present = (attendanceRows as any[]).filter(
        (row) => row.status === "present",
      ).length;
      const absent = (attendanceRows as any[]).filter(
        (row) => row.status === "absent",
      ).length;
      const late = (attendanceRows as any[]).filter(
        (row) => row.status === "late",
      ).length;
      const attendanceTotal = (attendanceRows as any[]).length;
      const attendancePercentage = attendanceTotal
        ? Math.round(((present + late) / attendanceTotal) * 100)
        : 0;

      const feePaid = (payments as any[]).reduce(
        (sum, payment) => sum + Number(payment.paidAmount || 0),
        0,
      );
      const outstandingFor = (payment: any) =>
        Math.max(
          0,
          Number(payment.totalAmount || 0) - Number(payment.paidAmount || 0),
        );
      const pending = (payments as any[])
        .filter(
          (payment) =>
            payment.status === "pending" || payment.status === "partial",
        )
        .reduce((sum, payment) => sum + outstandingFor(payment), 0);
      const overdue = (payments as any[])
        .filter((payment) => payment.status === "overdue")
        .reduce((sum, payment) => sum + outstandingFor(payment), 0);
      const feeDemand = (payments as any[]).reduce(
        (sum, payment) => sum + Number(payment.totalAmount || 0),
        0,
      );
      const collectionRate = feeDemand
        ? Math.min(100, Math.round((feePaid / feeDemand) * 100))
        : 0;

      const children = (students as any[]).map((student) => {
        const batch = batchById.get(idOf(student.batchId)) as any;
        return {
          id: idOf(student._id),
          name: student.name ?? "",
          enrollmentNo: student.enrollmentNo ?? "",
          photoDataUrl: student.photoDataUrl ?? "",
          className: student.className ?? "",
          section: student.section ?? "",
          courseName: courseById.get(idOf(student.courseId)) ?? "",
          batchName: batch?.name ?? "",
        };
      });

      const selectedBatch = batchById.get(idOf(selected.batchId)) as any;

      res.json({
        institute: instituteInfo,
        parent: {
          id: idOf(resolvedParent._id),
          name: resolvedParent.name,
          email: resolvedParent.email ?? "",
          phone: resolvedParent.phone ?? "",
          photoDataUrl: resolvedParent.logoDataUrl ?? "",
        },
        children,
        selectedChild: {
          id: studentId,
          courseId: idOf(selected.courseId),
          batchId: idOf(selected.batchId),
          name: selected.name ?? "",
          email: selected.email ?? "",
          phone: selected.phone ?? "",
          enrollmentNo: selected.enrollmentNo ?? "",
          photoDataUrl: selected.photoDataUrl ?? "",
          className: selected.className ?? "",
          section: selected.section ?? "",
          board: selected.board ?? "",
          boardOther: selected.boardOther ?? "",
          schoolName: selected.schoolName ?? "",
          academicYear:
            selected.academicYear ?? selectedBatch?.academicYear ?? "",
          dateOfBirth: selected.dateOfBirth ?? "",
          gender: selected.gender ?? "",
          genderOther: selected.genderOther ?? "",
          bloodGroup: selected.bloodGroup ?? "",
          lastClassPercentage: selected.lastClassPercentage ?? "",
          lastClassMarks: selected.lastClassMarks ?? "",
          aadhaarCard: selected.aadhaarCard ?? "",
          previousMarksheet: selected.previousMarksheet ?? "",
          documents: Array.isArray(selected.documents) ? selected.documents : [],
          parentName: selected.parentName ?? "",
          parentPhone: selected.parentPhone ?? "",
          fatherName: selected.fatherName ?? "",
          fatherOccupation: selected.fatherOccupation ?? "",
          fatherPhone: selected.fatherPhone ?? "",
          fatherWhatsapp: selected.fatherWhatsapp ?? "",
          motherName: selected.motherName ?? "",
          motherOccupation: selected.motherOccupation ?? "",
          motherPhone: selected.motherPhone ?? "",
          motherWhatsapp: selected.motherWhatsapp ?? "",
          emergencyPhone: selected.emergencyPhone ?? "",
          correspondenceAddress: selected.correspondenceAddress ?? "",
          correspondenceDistrict: selected.correspondenceDistrict ?? "",
          correspondenceState: selected.correspondenceState ?? "",
          correspondencePin: selected.correspondencePin ?? "",
          permanentAddress: selected.permanentAddress ?? "",
          permanentDistrict: selected.permanentDistrict ?? "",
          permanentState: selected.permanentState ?? "",
          permanentPin: selected.permanentPin ?? "",
          courseName: courseById.get(idOf(selected.courseId)) ?? "",
          batchName: selectedBatch?.name ?? "",
          batchSchedule: selectedBatch?.schedule ?? "",
        },
        attendance: {
          present,
          absent,
          late,
          total: attendanceTotal,
          percentage: attendancePercentage,
          recent: (attendanceRows as any[]).slice(0, 12).map((row) => ({
            id: idOf(row._id),
            date: row.date,
            status: row.status,
            remarks: row.remarks ?? "",
          })),
        },
        fees: {
          paid: feePaid,
          pending,
          overdue,
          outstanding: pending + overdue,
          collectionRate,
          recent: (payments as any[]).slice(0, 24).map((payment) => ({
            id: idOf(payment._id),
            month: payment.month,
            monthLabel: payment.monthLabel,
            dueDate: payment.dueDate,
            paidDate: payment.paidDate ?? "",
            amount: payment.amount ?? Math.max(0, Number(payment.totalAmount ?? 0) - Number(payment.lateFee ?? 0)),
            totalAmount: payment.totalAmount,
            paidAmount: payment.paidAmount ?? 0,
            lateFee: payment.lateFee ?? 0,
            status: payment.status,
            receiptNo: payment.receiptNo ?? "",
            paymentMethod: payment.paymentMethod ?? "",
          })),
        },
        homework: (homeworkRows as any[]).map((row) => ({
          id: idOf(row._id),
          title: row.title,
          description: row.description,
          subjectName: subjectById.get(idOf(row.subjectId)) ?? "Subject",
          dueDate: row.dueDate,
          status: row.status,
          fileUrl: row.fileUrl ?? "",
        })),
        exams: (exams as any[]).map((exam) => {
          const mark: any = markByExam.get(idOf(exam._id));
          const title = exam.title ?? exam.name ?? "Exam";
          const examDate = exam.examDate ?? exam.date ?? exam.startTime ?? "";
          const examType =
            exam.examType === "online" || exam.type === "online" || exam.isOnline
              ? "online"
              : "offline";
          return {
            id: idOf(exam._id),
            // Keep both the old Parent API keys and the exact Student App keys.
            name: title,
            title,
            type: exam.type ?? examType,
            examType,
            subjectName: subjectById.get(idOf(exam.subjectId)) ?? "Subject",
            date: examDate,
            examDate,
            startTime: exam.startTime ?? "",
            endTime: exam.endTime ?? "",
            duration: exam.duration ?? exam.durationMinutes ?? 0,
            durationMinutes: exam.durationMinutes ?? exam.duration ?? 0,
            room: exam.room ?? exam.venue ?? "",
            venue: exam.venue ?? exam.room ?? "",
            instructions: exam.instructions ?? "",
            syllabus: exam.syllabus ?? "",
            // URL is returned for data parity, but Parent Child View never launches tests.
            examUrl: exam.examUrl ?? exam.link ?? "",
            totalMarks: exam.totalMarks,
            passingMarks: exam.passingMarks,
            status: exam.status,
            marksObtained: mark?.marksObtained ?? null,
            grade: mark?.grade ?? "",
            resultStatus:
              mark?.resultStatus ??
              (mark?.marksObtained != null && exam.passingMarks != null
                ? Number(mark.marksObtained) >= Number(exam.passingMarks)
                  ? "Pass"
                  : "Fail"
                : ""),
            remarks: mark?.remarks ?? "",
          };
        }),
        timetable: (timetableRows as any[]).map((row) => {
          const teacher: any = teacherById.get(idOf(row.teacherId));
          return {
            id: idOf(row._id),
            day: row.day,
            startTime: row.startTime,
            endTime: row.endTime,
            room: row.room ?? "",
            subjectName: subjectById.get(idOf(row.subjectId)) ?? "Subject",
            teacherId: idOf(row.teacherId),
            teacherName: teacher?.name ?? "",
            teacherPhotoDataUrl: teacher?.photoDataUrl ?? "",
            teacherPositionTitle: teacher?.positionTitle ?? teacher?.subject ?? "",
          };
        }),
        teachers: (teachers as any[]).map((teacher) => ({
          id: idOf(teacher._id),
          name: teacher.name,
          photoDataUrl: teacher.photoDataUrl ?? "",
          positionTitle: teacher.positionTitle ?? "",
          subject: teacher.subject ?? "",
        })),
      });
    } catch (error: any) {
      console.error("Parent overview error:", error);
      res.status(500).json({
        error: error?.message ?? "Unable to load parent portal.",
      });
    }
  },
);

router.put(
  "/parent/self-update",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      const name = text(req.body?.name);
      const phone = text(req.body?.phone);
      const photoDataUrl =
        typeof req.body?.photoDataUrl === "string" ? req.body.photoDataUrl : "";

      if (!name || name.length > 120) {
        res.status(400).json({ error: "A valid name is required." });
        return;
      }
      if (phone && normalizePhone(phone).length !== 10) {
        res.status(400).json({ error: "Enter a valid 10-digit phone number." });
        return;
      }
      if (Buffer.byteLength(photoDataUrl, "utf8") > 3 * 1024 * 1024) {
        res.status(400).json({ error: "Profile photo is too large." });
        return;
      }

      const parent = await User.findById(req.user!.userId);
      if (!parent || parent.role !== "parent" || !parent.isApproved) {
        res.status(403).json({ error: "Active parent account required." });
        return;
      }

      parent.name = name;
      parent.phone = phone;
      parent.logoDataUrl = photoDataUrl;
      await parent.save();

      res.json({
        message: "Profile updated successfully.",
        parent: {
          id: idOf(parent._id),
          name: parent.name,
          email: parent.email,
          phone: parent.phone ?? "",
          photoDataUrl: parent.logoDataUrl ?? "",
        },
      });
    } catch (error: any) {
      console.error("Parent profile update error:", error);
      res.status(500).json({
        error: error?.message ?? "Unable to update parent profile.",
      });
    }
  },
);

router.put(
  "/parent/self-password",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      const currentPassword = String(req.body?.currentPassword ?? "");
      const newPassword = String(req.body?.newPassword ?? "");

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          error: "Current password and new password are required.",
        });
        return;
      }
      if (
        newPassword.length < 8 ||
        !/[a-z]/.test(newPassword) ||
        !/[A-Z]/.test(newPassword) ||
        !/\d/.test(newPassword)
      ) {
        res.status(400).json({
          error: "Use 8+ characters with uppercase, lowercase and a number.",
        });
        return;
      }

      const parent = await User.findById(req.user!.userId).select(
        "+password role isApproved",
      );
      if (!parent || parent.role !== "parent" || !parent.isApproved) {
        res.status(403).json({ error: "Active parent account required." });
        return;
      }

      if (!(await bcrypt.compare(currentPassword, parent.password))) {
        res.status(400).json({ error: "Current password is incorrect." });
        return;
      }
      if (await bcrypt.compare(newPassword, parent.password)) {
        res.status(400).json({
          error: "New password must be different from current password.",
        });
        return;
      }

      parent.password = await bcrypt.hash(newPassword, 12);
      await parent.save();
      res.json({ message: "Password updated successfully." });
    } catch (error: any) {
      console.error("Parent password update error:", error);
      res.status(500).json({
        error: error?.message ?? "Unable to update password.",
      });
    }
  },
);

router.get(
  "/parent/dashboard",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      let parent = await getParentAccount(req.user!.userId);
      if (!parent) {
        res.status(404).json({ error: "Parent account not found." });
        return;
      }
      if (!parent.isApproved) {
        res.status(403).json({ error: "Parent account is inactive." });
        return;
      }
      if (!parent.instituteId) {
        res.status(400).json({ error: "Parent account is not linked to an institute." });
        return;
      }

      const resolvedParent = await attachLegacyParentToFamily(parent);
      if (!resolvedParent?.instituteId) {
        res.status(400).json({ error: "Parent account is not linked to an institute." });
        return;
      }

      const childIds = await linkedStudentIdsForParent(resolvedParent);
      const [institute, children] = await Promise.all([
        Institute.findById(resolvedParent.instituteId).select("instituteName logoDataUrl academicYear").lean(),
        childIds.length
          ? Student.find({ _id: { $in: childIds }, instituteId: resolvedParent.instituteId, status: { $ne: "inactive" } })
              .select("name enrollmentNo className section academicYear schoolName photoDataUrl status")
              .sort({ className: 1, name: 1 })
              .lean()
          : Promise.resolve([]),
      ]);

      const order = new Map(childIds.map((id, index) => [id, index]));
      (children as any[]).sort((a, b) => (order.get(String(a._id)) ?? 999) - (order.get(String(b._id)) ?? 999));

      res.json({
        parent: {
          id: String(resolvedParent._id),
          name: resolvedParent.name,
          email: resolvedParent.email ?? "",
          loginId: resolvedParent.loginId ?? resolvedParent.email ?? "",
          phone: resolvedParent.phone ?? "",
          relation: resolvedParent.parentRelation ?? "guardian",
        },
        institute: {
          id: String(resolvedParent.instituteId),
          name: institute?.instituteName ?? "Institute",
          logoDataUrl: institute?.logoDataUrl ?? "",
          academicYear: institute?.academicYear ?? "",
        },
        children: (children as any[]).map((student) => ({
          id: String(student._id),
          name: student.name ?? "",
          enrollmentNo: student.enrollmentNo ?? "",
          className: student.className ?? "",
          section: student.section ?? "",
          academicYear: student.academicYear ?? "",
          schoolName: student.schoolName ?? "",
          photoDataUrl: student.photoDataUrl ?? "",
          status: student.status ?? "active",
        })),
      });
    } catch (error) {
      console.error("Parent dashboard error:", error);
      res.status(500).json({ error: "Unable to load parent dashboard." });
    }
  },
);

router.post(
  "/parent/change-password",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      const currentPassword = text(req.body?.currentPassword);
      const newPassword = text(req.body?.newPassword);
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current password and new password are required." });
        return;
      }
      if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
        res.status(400).json({ error: "Use 8+ characters with uppercase, lowercase and a number." });
        return;
      }

      const parent = await User.findById(req.user!.userId).select("+password role isApproved");
      if (!parent || parent.role !== "parent" || !parent.isApproved) {
        res.status(403).json({ error: "Active parent account required." });
        return;
      }
      if (!(await bcrypt.compare(currentPassword, parent.password))) {
        res.status(403).json({ error: "Current password is incorrect." });
        return;
      }
      if (await bcrypt.compare(newPassword, parent.password)) {
        res.status(400).json({ error: "New password must be different from current password." });
        return;
      }

      parent.password = await bcrypt.hash(newPassword, 12);
      await parent.save();
      res.json({ message: "Password updated successfully." });
    } catch (error) {
      console.error("Parent password update error:", error);
      res.status(500).json({ error: "Unable to update password." });
    }
  },
);

export default router;
