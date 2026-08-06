import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { authenticate, authorize } from "../middlewares/auth";
import { Institute } from "../models/Institute";
import { User } from "../models/User";

const router: IRouter = Router();

function formatInstitute(institute: any) {
return {
id: String(institute._id),
instituteName: institute.instituteName,
instituteType: institute.instituteType,
ownerName: institute.ownerName,
email: institute.email,
phone: institute.phone,
address: institute.address ?? "",
plan: institute.plan,
status: institute.status,
expiryDate: institute.expiryDate ?? null,
maxStudents: institute.maxStudents,
createdAt: institute.createdAt?.toISOString?.() ?? null,
updatedAt: institute.updatedAt?.toISOString?.() ?? null,
};
}

router.get(
"/institutes",
authenticate,
authorize("super_admin"),
async (_req, res): Promise<void> => {
const institutes = await Institute.find().sort({ createdAt: -1 });

res.json(institutes.map(formatInstitute));

}
);

router.post(
"/institutes",
authenticate,
authorize("super_admin"),
async (req, res): Promise<void> => {
const {
instituteName,
instituteType,
ownerName,
email,
phone,
address,
plan,
status,
expiryDate,
maxStudents,
} = req.body;

if (!instituteName || !instituteType || !ownerName || !email || !phone) {
  res.status(400).json({
    error:
      "instituteName, instituteType, ownerName, email and phone are required",
  });
  return;
}

const institute = await Institute.create({
  instituteName,
  instituteType,
  ownerName,
  email: String(email).toLowerCase().trim(),
  phone,
  address,
  plan,
  status,
  expiryDate,
  maxStudents,
});

res.status(201).json(formatInstitute(institute));

}
);

router.patch(
"/institutes/:id",
authenticate,
authorize("super_admin"),
async (req, res): Promise<void> => {
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

const institute = await Institute.findByIdAndUpdate(id, req.body, {
  new: true,
});

if (!institute) {
  res.status(404).json({
    error: "Institute not found",
  });
  return;
}

res.json(formatInstitute(institute));

}
);

router.delete(
"/institutes/:id",
authenticate,
authorize("super_admin"),
async (req, res): Promise<void> => {
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

const institute = await Institute.findByIdAndDelete(id);

if (!institute) {
  res.status(404).json({
    error: "Institute not found",
  });
  return;
}

res.sendStatus(204);

}
);

router.post(
"/institutes/:id/admin",
authenticate,
authorize("super_admin"),
async (req, res): Promise<void> => {
const instituteId = Array.isArray(req.params.id)
? req.params.id[0]
: req.params.id;

const { name, email, password } = req.body;

if (!name || !email || !password) {
  res.status(400).json({
    error: "name, email and password are required",
  });
  return;
}

const institute = await Institute.findById(instituteId);

if (!institute) {
  res.status(404).json({
    error: "Institute not found",
  });
  return;
}

const cleanEmail = String(email).toLowerCase().trim();

const existingUser = await User.findOne({
  email: cleanEmail,
});

if (existingUser) {
  res.status(400).json({
    error: "Email already registered",
  });
  return;
}

const hashedPassword = await bcrypt.hash(String(password), 10);

const user = await User.create({
  name,
  email: cleanEmail,
  password: hashedPassword,
  role: "institute_admin",
  instituteId: institute._id,
  isApproved: true,
});

res.status(201).json({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  instituteId: user.instituteId ? String(user.instituteId) : null,
  isApproved: user.isApproved,
});

}
);

export default router;