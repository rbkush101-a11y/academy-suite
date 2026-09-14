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
    phone: (user as any).phone ?? "",
    businessAddress: (user as any).businessAddress ?? "",
    businessType: (user as any).businessType ?? "",
    promoCode: (user as any).promoCode ?? "",
    logoDataUrl: (user as any).logoDataUrl ?? "",
    role: user.role,
    instituteId: user.instituteId ? String(user.instituteId) : null,
    isApproved: user.isApproved,
    createdAt: user.createdAt,
  });
});

router.patch("/auth/me", authenticate, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const updateData: any = {};

    if (req.body.name !== undefined) {
      updateData.name = String(req.body.name).trim();
    }

    if (req.body.email !== undefined) {
      updateData.email = String(req.body.email).toLowerCase().trim();
    }

    if (req.body.phone !== undefined) {
      updateData.phone = String(req.body.phone).trim();
    }

    if (req.body.businessAddress !== undefined) {
      updateData.businessAddress = String(req.body.businessAddress).trim();
    }

    if (req.body.businessType !== undefined) {
      updateData.businessType = String(req.body.businessType).trim();
    }

    if (req.body.promoCode !== undefined) {
      updateData.promoCode = String(req.body.promoCode).trim();
    }

    if (req.body.logoDataUrl !== undefined) {
      updateData.logoDataUrl = String(req.body.logoDataUrl);
    }

    // Password change
    if (req.body.password && String(req.body.password).trim().length > 0) {
      const plainPassword = String(req.body.password).trim();

      if (plainPassword.length < 6) {
        res.status(400).json({
          error: "Password minimum 6 characters hona chahiye.",
        });
        return;
      }

      if (role === "student") {
        updateData.loginPassword = await bcrypt.hash(plainPassword, 10);
      } else {
        updateData.password = await bcrypt.hash(plainPassword, 10);
      }
    }

    if (role === "student") {
      const student = await Student.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-loginPassword");

      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      res.json({
        id: String(student._id),
        name: student.name,
        email: student.email ?? "",
        phone: student.phone ?? "",
        role: "student",
        instituteId: String(student.instituteId),
      });
      return;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: (user as any).phone ?? "",
      businessAddress: (user as any).businessAddress ?? "",
      businessType: (user as any).businessType ?? "",
      promoCode: (user as any).promoCode ?? "",
      logoDataUrl: (user as any).logoDataUrl ?? "",
      role: user.role,
      instituteId: user.instituteId ? String(user.instituteId) : null,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message ?? "Profile update nahi hua.",
    });
  }
});

export default router;
