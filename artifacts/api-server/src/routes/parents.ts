import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { authenticate } from "../middlewares/auth";
import { signToken } from "../lib/jwt";
import { getDeviceName, getDeviceType, getRequestIp, getUserAgent } from "../lib/auth-security";
import { recordAudit } from "../lib/foundation";
import { Batch } from "../models/Batch";
import { Institute } from "../models/Institute";
import { ParentFamily } from "../models/ParentFamily";
import { Student } from "../models/Student";
import { User } from "../models/User";
import { UserSession } from "../models/UserSession";

const router: IRouter = Router();
const PARENT_VIEW_MINUTES = 30;

const text = (value: unknown) => String(value ?? "").trim();
const normalizeName = (value: unknown) => text(value).toLowerCase().replace(/\s+/g, " ");
const normalizePhone = (value: unknown) => text(value).replace(/\D/g, "").slice(-10);
const idOf = (value: unknown) => (value ? String(value) : "");

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
    "name email loginId phone role instituteId isApproved linkedStudentIds parentFamilyId parentRelation",
  );
}

async function linkedStudentIdsForParent(parent: any): Promise<string[]> {
  if (parent?.parentFamilyId) {
    const family = await ParentFamily.findOne({
      _id: parent.parentFamilyId,
      instituteId: parent.instituteId,
    }).select("studentIds");
    if (family) return family.studentIds.map((id) => String(id));
  }
  return (parent?.linkedStudentIds ?? []).map((id: unknown) => String(id));
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
        const fatherAccount = accounts.find((account) => account.parentRelation === "father");
        const motherAccount = accounts.find((account) => account.parentRelation === "mother");

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
            account: accountShape(fatherAccount),
          },
          mother: {
            name: family.motherName ?? "",
            phone: family.motherPhone ?? "",
            account: accountShape(motherAccount),
          },
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
      const relationInput = text(req.body?.relation).toLowerCase();
      if (!Types.ObjectId.isValid(familyId) || !["father", "mother"].includes(relationInput)) {
        res.status(400).json({ error: "Select a valid family and parent." });
        return;
      }
      const relation: "father" | "mother" = relationInput as "father" | "mother";

      const family = await ParentFamily.findOne({ _id: familyId, instituteId });
      if (!family) {
        res.status(404).json({ error: "Family not found." });
        return;
      }

      const name = relation === "father" ? text(family.fatherName) : text(family.motherName);
      const phone = relation === "father" ? text(family.fatherPhone) : text(family.motherPhone);
      if (!name) {
        res.status(400).json({ error: `${relation === "father" ? "Father" : "Mother"} name is missing in student records.` });
        return;
      }

      const loginId = text(req.body?.loginId).toLowerCase();
      const password = text(req.body?.password);
      const isApproved = req.body?.isApproved !== false;
      if (!loginId) {
        res.status(400).json({ error: "Login ID is required." });
        return;
      }
      if (password && (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))) {
        res.status(400).json({ error: "Password must have 8+ characters, uppercase, lowercase and a number." });
        return;
      }

      let user = await User.findOne({ instituteId, role: "parent", parentFamilyId: family._id, parentRelation: relation });
      if (!user) {
        if (!password) {
          res.status(400).json({ error: "Password is required when creating a parent login." });
          return;
        }
        user = await User.create({
          name,
          email: loginId,
          loginId,
          phone,
          password: await bcrypt.hash(password, 12),
          role: "parent",
          instituteId,
          isApproved,
          parentFamilyId: family._id,
          parentRelation: relation,
          linkedStudentIds: family.studentIds,
        });
      } else {
        user.name = name;
        user.phone = phone;
        user.email = loginId;
        user.loginId = loginId;
        user.isApproved = isApproved;
        user.parentFamilyId = family._id;
        user.parentRelation = relation;
        user.linkedStudentIds = family.studentIds;
        if (password) user.password = await bcrypt.hash(password, 12);
        await user.save();
      }

      await UserSession.updateMany(
        { userId: String(user._id), principalType: "user", revokedAt: null },
        { $set: { revokedAt: new Date(), revokeReason: "parent_account_updated" } },
      );

      await recordAudit(req, "parent.login.upsert", "user", String(user._id), {
        familyId: String(family._id),
        relation,
        linkedStudentIds: family.studentIds.map(String),
      });

      res.json({
        account: {
          id: String(user._id),
          name: user.name,
          loginId: user.loginId ?? user.email,
          phone: user.phone ?? "",
          isApproved: Boolean(user.isApproved),
          relation,
        },
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        res.status(409).json({ error: "That login ID is already being used." });
        return;
      }
      console.error("Parent login upsert error:", error);
      res.status(500).json({ error: "Unable to save parent login." });
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
  "/parent/student-view/start",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      let parent = await getParentAccount(req.user!.userId);
      if (!parent || !parent.isApproved || !parent.instituteId) {
        res.status(403).json({ error: "Active parent account required." });
        return;
      }

      const resolvedParent = await attachLegacyParentToFamily(parent);
      if (!resolvedParent?.instituteId) {
        res.status(403).json({ error: "Active parent account required." });
        return;
      }

      const studentId = text(req.body?.studentId);
      if (!Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ error: "Select a valid child." });
        return;
      }

      const linkedIds = await linkedStudentIdsForParent(resolvedParent);
      if (!linkedIds.includes(studentId)) {
        res.status(403).json({ error: "This child is not linked to your parent account." });
        return;
      }

      const student = await Student.findOne({
        _id: studentId,
        instituteId: resolvedParent.instituteId,
        status: "active",
      }).select("name email enrollmentNo instituteId batchId courseId");

      if (!student) {
        res.status(404).json({ error: "Active student not found." });
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + PARENT_VIEW_MINUTES * 60 * 1000);
      const userAgent = getUserAgent(req);

      await UserSession.updateMany(
        {
          supportMode: true,
          supportActorId: req.user!.userId,
          supportActorRole: "parent",
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { revokedAt: now, revokeReason: "parent_view_replaced" } },
      );

      const viewSession = await UserSession.create({
        userId: String(student._id),
        principalType: "student",
        instituteId: student.instituteId,
        role: "student",
        ipAddress: getRequestIp(req),
        userAgent,
        deviceName: `Parent View · ${getDeviceName(userAgent)}`,
        deviceType: getDeviceType(userAgent),
        lastLoginAt: now,
        lastSeenAt: now,
        expiresAt,
        supportMode: true,
        supportActorId: req.user!.userId,
        supportActorRole: "parent",
        supportReason: "Parent viewing linked child's student dashboard",
      });

      const token = signToken({
        userId: String(student._id),
        email: student.email ?? "",
        role: "student",
        instituteId: String(student.instituteId),
        activeBranchId: null,
        customRoleId: null,
        sessionId: String(viewSession._id),
      });

      res.json({
        token,
        sessionId: String(viewSession._id),
        expiresAt: expiresAt.toISOString(),
        readOnly: true,
        student: {
          id: String(student._id),
          name: student.name,
          enrollmentNo: student.enrollmentNo,
        },
      });
    } catch (error) {
      console.error("Parent student view start error:", error);
      res.status(500).json({ error: "Unable to open student dashboard." });
    }
  },
);

router.post(
  "/parent/student-view/end",
  authenticate,
  requireParent,
  async (req, res): Promise<void> => {
    try {
      const sessionId = text(req.body?.sessionId);
      if (!mongoose.isValidObjectId(sessionId)) {
        res.status(400).json({ error: "A valid parent-view session is required." });
        return;
      }

      const session = await UserSession.findOne({
        _id: sessionId,
        supportMode: true,
        supportActorId: req.user!.userId,
        supportActorRole: "parent",
      });

      if (!session) {
        res.status(404).json({ error: "Parent-view session not found." });
        return;
      }

      if (!session.revokedAt) {
        session.revokedAt = new Date();
        session.revokeReason = "parent_view_exit";
        await session.save();
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Parent student view end error:", error);
      res.status(500).json({ error: "Unable to close student dashboard view." });
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
