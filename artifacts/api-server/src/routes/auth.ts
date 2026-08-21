import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Student } from "../models/Student";
import { signToken } from "../lib/jwt";
import { authenticate } from "../middlewares/auth";
import { Course } from "../models/Course";
import { Batch } from "../models/Batch";

const router: IRouter = Router();

router.post("/auth/signup", async (_req, res): Promise<void> => {
res.status(403).json({
error: "Public signup is disabled. Please contact administrator.",
});
});

/*
TEMPORARY FIX ROUTE
Login successful hone ke baad is route ko disabled/comment rakho.

router.get("/auth/fix-rbk-super-admin", async (_req, res): Promise<void> => {
const email = "rbkush101@gmail.com";
const plainPassword = "Admin@12345";
const hashedPassword = await bcrypt.hash(plainPassword, 10);

await User.deleteMany({
email: email.toLowerCase().trim(),
});

const user = await User.create({
name: "Rishabh Kushwaha",
email: email.toLowerCase().trim(),
password: hashedPassword,
role: "super_admin",
isApproved: true,
});

const passwordTest = await bcrypt.compare(plainPassword, user.password);

res.json({
message: "RBK Super Admin fixed successfully",
email: user.email,
role: user.role,
isApproved: user.isApproved,
passwordTest: passwordTest ? "PASS" : "FAIL",
loginPassword: plainPassword,
});
});
*/

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, loginId, password } = req.body;

  const identifier = String(loginId || email || "").toLowerCase().trim();

  if (!identifier || !password) {
    res.status(400).json({ error: "Login ID and password are required" });
    return;
  }

  // 1) Pehle staff/admin/teacher/accountant user me dhoondho
  // NOTE: email fallback rakha hai taaki old admin lock na ho.
  const user = await User.findOne({
    $or: [{ loginId: identifier }, { email: identifier }],
  });

  if (user) {
    const match = await bcrypt.compare(String(password), user.password);

    if (!match) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.isApproved !== true) {
      res.status(403).json({
        error: "Your account is pending approval. Please contact administrator.",
      });
      return;
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      instituteId: user.instituteId ? String(user.instituteId) : null,
    });

    res.json({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        loginId: user.loginId ?? "",
        role: user.role,
        instituteId: user.instituteId ? String(user.instituteId) : null,
        isApproved: user.isApproved,
      },
    });
    return;
  }

  // 2) Agar User me nahi mila, Student me dhoondho
  const student = await Student.findOne({
    loginId: identifier,
    status: "active",
  }).select("+loginPassword");

  if (!student || !student.loginPassword) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const match = await bcrypt.compare(String(password), student.loginPassword);

  if (!match) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({
    userId: String(student._id),
    email: student.email ?? "",
    role: "student",
    instituteId: String(student.instituteId),
  });

  res.json({
    token,
    user: {
      id: String(student._id),
      name: student.name,
      email: student.email ?? "",
      loginId: student.loginId ?? "",
      role: "student",
      instituteId: String(student.instituteId),
      enrollmentNo: student.enrollmentNo,
      courseId: String(student.courseId),
      batchId: String(student.batchId),
    },
  });
});

router.post("/auth/student-login", async (req, res): Promise<void> => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    res.status(400).json({ error: "loginId and password are required" });
    return;
  }

  const cleanLoginId = String(loginId).toLowerCase().trim();

  const student = await Student.findOne({
    loginId: cleanLoginId,
    status: "active",
  }).select("+loginPassword");

  if (!student || !student.loginPassword) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const match = await bcrypt.compare(String(password), student.loginPassword);

  if (!match) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({
    userId: String(student._id),
    email: student.email ?? "",
    role: "student",
    instituteId: String(student.instituteId),
  });

  res.json({
    token,
    user: {
      id: String(student._id),
      name: student.name,
      email: student.email ?? "",
      role: "student",
      instituteId: String(student.instituteId),
      enrollmentNo: student.enrollmentNo,
      courseId: String(student.courseId),
      batchId: String(student.batchId),
    },
  });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  if (req.user!.role === "student") {
  const student = await Student.findById(req.user!.userId).select(
    "-loginPassword",
  );

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [course, batch] = await Promise.all([
    Course.findById(student.courseId).select("name"),
    Batch.findById(student.batchId).select("name"),
  ]);

  res.json({
    id: String(student._id),
    name: student.name,
    email: student.email ?? "",
    phone: student.phone ?? "",
    role: "student",
    instituteId: String(student.instituteId),
    enrollmentNo: student.enrollmentNo,
    courseId: String(student.courseId),
    courseName: course?.name ?? "",
    batchId: String(student.batchId),
    batchName: batch?.name ?? "",
    academicYear: student.academicYear ?? "",
    className: student.className ?? "",
    section: student.section ?? "",
    board: student.board ?? "",
    schoolName: student.schoolName ?? "",
    photoDataUrl: student.photoDataUrl ?? "",
    fatherName: student.fatherName ?? student.parentName ?? "",
    motherName: student.motherName ?? "",
    createdAt: student.createdAt,
  });
  return;
}

  const user = await User.findById(req.user!.userId).select("-password");

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    instituteId: user.instituteId ? String(user.instituteId) : null,
    isApproved: user.isApproved,
    createdAt: user.createdAt,
  });
});

export default router;
