import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Staff } from "../models/Staff";

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
    salary: staff.salary ?? 0,
    joinDate: staff.joinDate,
    status: staff.status,
    employeeStatus: staff.employeeStatus ?? "",
    payRateType: staff.payRateType ?? "monthly",
    workTimingFrom: staff.workTimingFrom ?? "",
    workTimingTo: staff.workTimingTo ?? "",
    contractWorkDetail: staff.contractWorkDetail ?? "",
    gender: staff.gender ?? "",
    dateOfBirth: staff.dateOfBirth ?? "",
    localAddress: staff.localAddress ?? "",
    localState: staff.localState ?? "",
    localPin: staff.localPin ?? "",
    permanentAddress: staff.permanentAddress ?? "",
    permanentState: staff.permanentState ?? "",
    permanentPin: staff.permanentPin ?? "",
    aadhaarNumber: staff.aadhaarNumber ?? "",
    bankName: staff.bankName ?? "",
    bankBranch: staff.bankBranch ?? "",
    accountName: staff.accountName ?? "",
    accountNumber: staff.accountNumber ?? "",
    ifscCode: staff.ifscCode ?? "",
    upiId: staff.upiId ?? "",
    photoDataUrl: staff.photoDataUrl ?? "",
    documents: Array.isArray(staff.documents) ? staff.documents : [],
    address: staff.address ?? "",
    createdAt: staff.createdAt.toISOString(),
  };
}

function cleanBody(body: any) {
  const allowed = [
    "name","firstName","lastName","email","phone","homePhone","role","staffType","positionTitle","qualification","subject",
    "salary","joinDate","status","employeeStatus","payRateType","workTimingFrom","workTimingTo","contractWorkDetail","gender","dateOfBirth","localAddress","localState",
    "localPin","permanentAddress","permanentState","permanentPin","aadhaarNumber","bankName",
    "bankBranch","accountName","accountNumber","ifscCode","upiId","photoDataUrl","documents","address",
  ];
  const data: Record<string, any> = {};
  for (const field of allowed) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

router.get("/staff", authenticate, authorize("super_admin","institute_admin","staff"), async (req, res): Promise<void> => {
  try {
    const filter: any = {};
    const { staffType } = req.query as { staffType?: string };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin") {
      if (!instituteId) { res.status(403).json({ error: "Your account is not linked to an institute" }); return; }
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

router.post("/staff", authenticate, authorize("super_admin","institute_admin"), async (req, res): Promise<void> => {
  try {
    const user = getLoggedInUser(req);
    let instituteId = getInstituteIdForUser(req);
    if (user.role === "super_admin") instituteId = req.body.instituteId ? String(req.body.instituteId) : null;
    if (!instituteId) { res.status(400).json({ error: "instituteId is required to create staff" }); return; }

    const data = cleanBody(req.body);
    if (!data.name || !data.phone || !data.role || data.salary === undefined || !data.joinDate) {
      res.status(400).json({ error: "Name, mobile, role, salary and start date are required" }); return;
    }

    if (data.staffType !== "academic" && data.staffType !== "computer") {
      data.staffType = "academic";
    }

    const staff = await Staff.create({ ...data, instituteId });
    res.status(201).json(formatStaff(staff));
  } catch (error: any) {
    console.error("STAFF CREATE ERROR:", error);
    res.status(500).json({ error: error?.message ?? "Unable to create staff" });
  }
});

router.patch("/staff/:id", authenticate, authorize("super_admin","institute_admin"), async (req, res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const filter: any = { _id: id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin") {
      if (!instituteId) { res.status(403).json({ error: "Your account is not linked to an institute" }); return; }
      filter.instituteId = instituteId;
    }
    const updateData = cleanBody(req.body);

    if (updateData.staffType !== undefined &&
        updateData.staffType !== "academic" &&
        updateData.staffType !== "computer") {
      res.status(400).json({ error: "staffType must be academic or computer" });
      return;
    }

    const staff = await Staff.findOneAndUpdate(filter, updateData, { new: true, runValidators: true });
    if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
    res.json(formatStaff(staff));
  } catch (error: any) {
    console.error("STAFF UPDATE ERROR:", error);
    res.status(500).json({ error: error?.message ?? "Unable to update staff" });
  }
});

router.delete("/staff/:id", authenticate, authorize("super_admin","institute_admin"), async (req, res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const filter: any = { _id: id };
    const user = getLoggedInUser(req);
    const instituteId = getInstituteIdForUser(req);
    if (user.role !== "super_admin") {
      if (!instituteId) { res.status(403).json({ error: "Your account is not linked to an institute" }); return; }
      filter.instituteId = instituteId;
    }
    const staff = await Staff.findOneAndDelete(filter);
    if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
    res.sendStatus(204);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Unable to delete staff" });
  }
});

export default router;
