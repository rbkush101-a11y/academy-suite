import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { authenticate, authorize } from "../middlewares/auth";
import { Staff } from "../models/Staff";
import { User } from "../models/User";

const router: IRouter = Router();

function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);
  if (user?.role === "super_admin") return null;
  return user?.instituteId ? String(user.instituteId) : null;
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
    instituteId: staff.instituteId ? String(staff.instituteId) : null,
    role: staff.role,
    staffType: staff.staffType ?? "academic",
    positionTitle: staff.positionTitle ?? "",
    qualification: staff.qualification ?? "",
    subject: staff.subject ?? "",
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
    documents: Array.isArray(staff.documents) ? staff.documents : [],

    // 🔑 Employee Code
    empId: empIdValue,
    employeeId: empIdValue,

    // 🔑 Portal Access
    loginEnabled: staff.loginEnabled ?? false,
    username: staff.username ?? "",
    accessLevel: staff.accessLevel ?? "staff",

    // Payroll
    employmentType: staff.employmentType ?? "full_time",
    monthlySalary: staff.monthlySalary ?? 0,
    perClassRate: staff.perClassRate ?? 0,
    baseSalary: staff.baseSalary ?? 0,
    hourlyRate: staff.hourlyRate ?? 0,
    pfDeduction: staff.pfDeduction ?? 12,
    tdsDeduction: staff.tdsDeduction ?? 0,

    createdAt: staff.createdAt ? staff.createdAt.toISOString() : new Date().toISOString(),
  };
}

function cleanBody(body: any) {
  const allowed = [
    "name", "firstName", "lastName", "email", "phone", "homePhone",
    "role", "staffType", "positionTitle", "qualification", "subject", "experience",
    "salary", "joinDate", "status", "employeeStatus", "payRateType",
    "workTimingFrom", "workTimingTo", "contractWorkDetail",
    "gender", "dateOfBirth",
    "localAddress", "localState", "localDistrict", "localPin",
    "permanentAddress", "permanentState", "permanentDistrict", "permanentPin",
    "address",
    "aadhaarNumber", "panNumber", "bloodGroup",
    "bankName", "bankBranch", "accountName", "accountNumber", "ifscCode", "upiId",
    "photoDataUrl", "documents",
    "empId", "employeeId",
    "loginEnabled", "username", "accessLevel",
    "employmentType", "monthlySalary", "perClassRate", "baseSalary", "hourlyRate", "pfDeduction", "tdsDeduction",
  ];
  const data: Record<string, any> = {};
  for (const field of allowed) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  // Ensure empId & employeeId stay in sync
  if (data.empId && !data.employeeId) data.employeeId = data.empId;
  if (data.employeeId && !data.empId) data.empId = data.employeeId;
  return data;
}

// ==================== GET CURRENT TEACHER'S OWN STAFF RECORD ====================
router.get("/staff/me", authenticate, async (req, res): Promise<void> => {
  try {
    const user = req.user!;
    const conditions: any[] = [];
    if (user.email) conditions.push({ email: user.email.toLowerCase().trim() });
    if ((user as any).loginId) conditions.push({ username: (user as any).loginId.toLowerCase().trim() });
    if ((user as any).phone) conditions.push({ phone: (user as any).phone });

    if (conditions.length === 0) {
      res.status(400).json({ error: "User identity info missing" });
      return;
    }

    const staff = await Staff.findOne({ $or: conditions });
    if (!staff) {
      res.status(404).json({ error: "Staff record not found" });
      return;
    }
    res.json(formatStaff(staff));
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to load staff profile" });
  }
});

// ==================== GET ALL STAFF ====================
router.get("/staff", authenticate, authorize("super_admin", "institute_admin", "staff", "teacher"), async (req, res): Promise<void> => {
  try {
    const filter: any = {};
    const { staffType } = req.query as { staffType?: string };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }
    if (staffType === "academic" || staffType === "computer") {
      filter.staffType = staffType;
    }

    const staff = await Staff.find(filter).sort({ createdAt: -1 });
    res.json(staff.map(formatStaff));
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to load staff" });
  }
});

// ==================== CREATE STAFF ====================
router.post("/staff", authenticate, authorize("super_admin", "institute_admin"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    let instituteId = getInstituteIdForUser(req);
    if (user.role === "super_admin") instituteId = req.body.instituteId ? String(req.body.instituteId) : null;
    if (!instituteId) {
      res.status(400).json({ error: "instituteId is required to create staff" });
      return;
    }

    const data = cleanBody(req.body);
    const { loginEnabled, username, password, accessLevel } = req.body;

    if (!data.name || !data.phone || !data.role || data.salary === undefined || !data.joinDate) {
      res.status(400).json({ error: "Name, mobile, role, salary and start date are required" });
      return;
    }

    if (data.staffType !== "academic" && data.staffType !== "computer") {
      data.staffType = "academic";
    }

    // Auto-generate empId if missing
    if (!data.empId) {
      const count = await Staff.countDocuments({ instituteId });
      const nextNumber = count + 1;
      data.empId = `EMP-${String(nextNumber).padStart(3, "0")}`;
      data.employeeId = data.empId;
    }

    const staff = await Staff.create({
      ...data,
      instituteId,
      loginEnabled: Boolean(loginEnabled),
      username: username ? String(username).toLowerCase().trim() : "",
    });

    // Sync User table for login
    if (loginEnabled && username && password) {
      const hashedPassword = await bcrypt.hash(String(password), 10);
      await User.create({
        name: data.name,
        email: data.email
          ? String(data.email).toLowerCase().trim()
          : `${String(username).toLowerCase()}@institute.com`,
        loginId: String(username).toLowerCase().trim(),
        password: hashedPassword,
        role: accessLevel || "teacher",
        instituteId,
        isApproved: true,
        phone: data.phone,
      });
    }

    res.status(201).json(formatStaff(staff));
  } catch (error: any) {
    console.error("STAFF CREATE ERROR:", error);
    res.status(500).json({ error: error?.message ?? "Unable to create staff" });
  }
});

// ==================== UPDATE STAFF ====================
router.patch("/staff/:id", authenticate, authorize("super_admin", "institute_admin", "teacher", "staff"), async (req, res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const filter: any = { _id: id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin" && user.role !== "teacher" && user.role !== "staff") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }

    const oldStaff = await Staff.findOne(filter);
    if (!oldStaff) {
      res.status(404).json({ error: "Staff not found" });
      return;
    }

    const updateData = cleanBody(req.body);
    const { loginEnabled, username, password, accessLevel } = req.body;

    // Preserve existing empId if not provided
    if (!updateData.empId && oldStaff.empId) {
      updateData.empId = oldStaff.empId;
      updateData.employeeId = oldStaff.empId;
    }

    const updatedStaff = await Staff.findOneAndUpdate(
      filter,
      {
        ...updateData,
        loginEnabled: loginEnabled !== undefined ? Boolean(loginEnabled) : oldStaff.loginEnabled,
        username: username ? String(username).toLowerCase().trim() : oldStaff.username,
      },
      { new: true, runValidators: true }
    );

    // Sync User table
    const searchUserFilter = oldStaff.username
      ? { loginId: oldStaff.username.toLowerCase().trim() }
      : { email: oldStaff.email ? oldStaff.email.toLowerCase().trim() : "" };

    const activeUsername = String(username || oldStaff.username || user.email).toLowerCase().trim();
    const userPayload: any = {
      name: updatedStaff?.name ?? oldStaff.name,
      email: updatedStaff?.email ?? oldStaff.email,
      loginId: activeUsername,
      phone: updatedStaff?.phone ?? oldStaff.phone,
    };
    if (accessLevel) userPayload.role = accessLevel;

    if (password && String(password).trim().length > 0) {
      userPayload.password = await bcrypt.hash(String(password).trim(), 10);
    }

    const existingUser = await User.findOne(searchUserFilter);
    if (existingUser) {
      await User.findByIdAndUpdate(existingUser._id, userPayload);
    }

    res.json(formatStaff(updatedStaff));
  } catch (error: any) {
    console.error("STAFF UPDATE ERROR:", error);
    res.status(500).json({ error: error?.message ?? "Unable to update staff" });
  }
});

// ==================== DELETE STAFF ====================
router.delete("/staff/:id", authenticate, authorize("super_admin", "institute_admin"), async (req, res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const filter: any = { _id: id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }
      filter.instituteId = instituteId;
    }

    const staff = await Staff.findOne(filter);
    if (!staff) {
      res.status(404).json({ error: "Staff not found" });
      return;
    }

    if (staff.username) {
      await User.findOneAndDelete({ loginId: staff.username.toLowerCase().trim() });
    } else if (staff.email) {
      await User.findOneAndDelete({ email: staff.email.toLowerCase().trim() });
    }

    await Staff.findByIdAndDelete(id);
    res.sendStatus(204);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to delete staff" });
  }
});

export default router;