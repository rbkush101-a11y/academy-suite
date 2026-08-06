import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Student } from "../models/Student";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";

const router: IRouter = Router();

function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);

  if (user?.role === "super_admin") {
    return null;
  }

  return user?.instituteId ? String(user.instituteId) : null;
}

async function populateStudent(student: any) {
  const [batch, course] = await Promise.all([
    Batch.findById(student.batchId).select("name"),
    Course.findById(student.courseId).select("name"),
  ]);

  return {
    id: String(student._id),
    name: student.name,
    email: student.email ?? "",
    phone: student.phone,
    enrollmentNo: student.enrollmentNo,

    instituteId: student.instituteId ? String(student.instituteId) : null,

    batchId: String(student.batchId),
    batchName: batch?.name ?? null,

    courseId: String(student.courseId),
    courseName: course?.name ?? null,

    status: student.status,
    academicYear: student.academicYear,

    dateOfBirth: student.dateOfBirth ?? null,
    gender: student.gender ?? null,
    schoolName: student.schoolName ?? null,
    className: student.className ?? null,
    section: student.section ?? null,
    board: student.board ?? null,
    lastClassPercentage: student.lastClassPercentage ?? null,
    lastClassMarks: student.lastClassMarks ?? null,
    photoDataUrl: student.photoDataUrl ?? null,
    documents: Array.isArray(student.documents) ? student.documents : [],

    parentName: student.parentName ?? null,
    parentPhone: student.parentPhone ?? null,
    motherName: student.motherName ?? null,
    motherOccupation: student.motherOccupation ?? null,
    motherPhone: student.motherPhone ?? null,
    motherWhatsapp: student.motherWhatsapp ?? null,
    fatherName: student.fatherName ?? null,
    fatherOccupation: student.fatherOccupation ?? null,
    fatherPhone: student.fatherPhone ?? null,
    fatherWhatsapp: student.fatherWhatsapp ?? null,
    emergencyPhone: student.emergencyPhone ?? null,

    correspondenceAddress: student.correspondenceAddress ?? null,
    correspondenceDistrict: student.correspondenceDistrict ?? null,
    correspondenceState: student.correspondenceState ?? null,
    correspondencePin: student.correspondencePin ?? null,

    permanentAddress: student.permanentAddress ?? null,
    permanentDistrict: student.permanentDistrict ?? null,
    permanentState: student.permanentState ?? null,
    permanentPin: student.permanentPin ?? null,

    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  };
}

function cleanStudentBody(body: any) {
  const allowedFields = [
    "name",
    "email",
    "phone",
    "batchId",
    "courseId",
    "status",
    "academicYear",
    "dateOfBirth",
    "gender",
    "schoolName",
    "className",
    "section",
    "board",
    "lastClassPercentage",
    "lastClassMarks",
    "photoDataUrl",
    "documents",
    "parentName",
    "parentPhone",
    "motherName",
    "motherOccupation",
    "motherPhone",
    "motherWhatsapp",
    "fatherName",
    "fatherOccupation",
    "fatherPhone",
    "fatherWhatsapp",
    "emergencyPhone",
    "correspondenceAddress",
    "correspondenceDistrict",
    "correspondenceState",
    "correspondencePin",
    "permanentAddress",
    "permanentDistrict",
    "permanentState",
    "permanentPin",
  ];

  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field] === "" ? undefined : body[field];
    }
  }

  if (!data.email) {
    delete data.email;
  }

  return data;
}

async function generateEnrollmentNo(instituteId: string) {
  // SSC = Second School Classes | 202627 = academic session 2026-27
  const prefix = "SSC202627";

  const students = await Student.find({
    instituteId,
    enrollmentNo: new RegExp(`^${prefix}\\d+$`),
  })
    .select("enrollmentNo")
    .lean();

  const highestSerial = students.reduce((highest: number, student: any) => {
    const serialText = String(student.enrollmentNo ?? "").slice(prefix.length);
    const serial = Number.parseInt(serialText, 10);

    return Number.isFinite(serial) ? Math.max(highest, serial) : highest;
  }, 0);

  return `${prefix}${String(highestSerial + 1).padStart(3, "0")}`;
}

async function verifyCourseAndBatch(
  instituteId: string,
  courseId: string,
  batchId: string
) {
  const course = await Course.findOne({
    _id: courseId,
    instituteId,
  });

  if (!course) {
    return "Selected course does not belong to this institute";
  }

  const batch = await Batch.findOne({
    _id: batchId,
    instituteId,
    courseId,
  });

  if (!batch) {
    return "Selected batch does not belong to this course";
  }

  return null;
}

router.get(
  "/students",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff"),
  async (req, res): Promise<void> => {
    try {
      const { search, batchId, status } = req.query as Record<string, string>;
      const filter: any = {};

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      if (search) {
        filter.$or = [
          { name: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
          { enrollmentNo: new RegExp(search, "i") },
          { phone: new RegExp(search, "i") },
        ];
      }

      if (batchId) {
        filter.batchId = batchId;
      }

      if (status) {
        filter.status = status;
      }

      const students = await Student.find(filter).sort({
        createdAt: -1,
      });

      const result = await Promise.all(students.map(populateStudent));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load students",
      });
    }
  }
);

router.post(
  "/students",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);

      if (user.role === "super_admin") {
        instituteId = req.body.instituteId
          ? String(req.body.instituteId)
          : null;
      }

      if (!instituteId) {
        res.status(400).json({
          error: "instituteId is required to create a student",
        });
        return;
      }

      const data = cleanStudentBody(req.body);

      if (!data.name || !data.phone || !data.courseId || !data.batchId || !data.academicYear) {
        res.status(400).json({
          error: "Name, phone, course, batch and academic year are required",
        });
        return;
      }

      const validationError = await verifyCourseAndBatch(
        instituteId,
        data.courseId,
        data.batchId
      );

      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const enrollmentNo = await generateEnrollmentNo(instituteId);

      const student = await Student.create({
        ...data,
        enrollmentNo,
        instituteId,
      });

      await Batch.findByIdAndUpdate(data.batchId, {
        $addToSet: {
          studentIds: student._id,
        },
      });

      res.status(201).json(await populateStudent(student));
    } catch (error: any) {
      console.error("STUDENT CREATE ERROR:", error);

      res.status(500).json({
        error: error?.message ?? "Unable to create student",
      });
    }
  }
);

router.get(
  "/students/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff"),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {
        _id: req.params.id,
      };

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      const student = await Student.findOne(filter);

      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      res.json(await populateStudent(student));
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load student",
      });
    }
  }
);

router.patch(
  "/students/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {
        _id: req.params.id,
      };

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      const existingStudent = await Student.findOne(filter);

      if (!existingStudent) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      const updateData = cleanStudentBody(req.body);

      const nextCourseId = updateData.courseId ?? String(existingStudent.courseId);
      const nextBatchId = updateData.batchId ?? String(existingStudent.batchId);
      const effectiveInstituteId =
        instituteId ?? String(existingStudent.instituteId);

      const validationError = await verifyCourseAndBatch(
        effectiveInstituteId,
        nextCourseId,
        nextBatchId
      );

      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const oldBatchId = String(existingStudent.batchId);

      const student = await Student.findOneAndUpdate(
        filter,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      if (oldBatchId !== String(student.batchId)) {
        await Batch.findByIdAndUpdate(oldBatchId, {
          $pull: { studentIds: student._id },
        });

        await Batch.findByIdAndUpdate(student.batchId, {
          $addToSet: { studentIds: student._id },
        });
      }

      res.json(await populateStudent(student));
    } catch (error: any) {
      console.error("STUDENT UPDATE ERROR:", error);

      res.status(500).json({
        error: error?.message ?? "Unable to update student",
      });
    }
  }
);

router.delete(
  "/students/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {
        _id: req.params.id,
      };

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      const student = await Student.findOneAndDelete(filter);

      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      await Batch.updateMany(
        { studentIds: student._id },
        {
          $pull: {
            studentIds: student._id,
          },
        }
      );

      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to delete student",
      });
    }
  }
);

export default router;
