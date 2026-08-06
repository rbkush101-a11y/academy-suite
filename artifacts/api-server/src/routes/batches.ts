import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Batch } from "../models/Batch";
import { Course } from "../models/Course";
import { Student } from "../models/Student";

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

function getRouteId(req: any): string {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return String(id ?? "");
}

async function fmtBatch(batch: any) {
  const course = await Course.findById(batch.courseId).select("name");

  return {
    id: String(batch._id),
    name: batch.name,
    instituteId: batch.instituteId ? String(batch.instituteId) : null,
    courseId: String(batch.courseId),
    courseName: course?.name ?? null,
    capacity: batch.capacity,
    enrolled: batch.studentIds?.length ?? 0,
    schedule: batch.schedule,
    academicYear: batch.academicYear,
    startDate: batch.startDate,
    endDate: batch.endDate ?? null,
    status: batch.status,
    studentIds: (batch.studentIds ?? []).map(String),
    createdAt: batch.createdAt.toISOString(),
  };
}

function buildInstituteFilter(req: any, id?: string) {
  const filter: any = id ? { _id: id } : {};
  const user = getLoggedInUser(req);
  const instituteId = getInstituteIdForUser(req);

  if (user.role !== "super_admin") {
    if (!instituteId) {
      return { filter: null, instituteId: null };
    }
    filter.instituteId = instituteId;
  }

  return { filter, instituteId };
}

router.get(
  "/batches",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff", "student"),
  async (req, res): Promise<void> => {
    try {
      const { courseId, academicYear } = req.query as Record<string, string>;
      const { filter, instituteId } = buildInstituteFilter(req);

      if (!filter && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      if (courseId) filter.courseId = courseId;
      if (academicYear) filter.academicYear = academicYear;

      const batches = await Batch.find(filter).sort({ createdAt: -1 });
      res.json(await Promise.all(batches.map(fmtBatch)));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load batches" });
    }
  }
);

router.post(
  "/batches",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);

      if (user.role === "super_admin") {
        instituteId = req.body.instituteId ? String(req.body.instituteId) : null;
      }

      if (!instituteId) {
        res.status(400).json({ error: "instituteId is required to create a batch" });
        return;
      }

      const course = await Course.findOne({
        _id: req.body.courseId,
        instituteId,
      });

      if (!course) {
        res.status(400).json({ error: "Selected course does not belong to this institute" });
        return;
      }

      const batch = await Batch.create({
        name: req.body.name,
        courseId: req.body.courseId,
        capacity: req.body.capacity,
        schedule: req.body.schedule,
        academicYear: req.body.academicYear,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: req.body.status ?? "active",
        instituteId,
        studentIds: [],
      });

      res.status(201).json(await fmtBatch(batch));
    } catch (error: any) {
      console.error("BATCH CREATE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to create batch" });
    }
  }
);

router.get(
  "/batches/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff", "student"),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);
      const { filter, instituteId } = buildInstituteFilter(req, id);

      if (!filter && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const batch = await Batch.findOne(filter);

      if (!batch) {
        res.status(404).json({ error: "Batch not found" });
        return;
      }

      res.json(await fmtBatch(batch));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load batch" });
    }
  }
);

router.patch(
  "/batches/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);
      const { filter, instituteId } = buildInstituteFilter(req, id);

      if (!filter && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const updateData: any = {
        name: req.body.name,
        courseId: req.body.courseId,
        capacity: req.body.capacity,
        schedule: req.body.schedule,
        academicYear: req.body.academicYear,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: req.body.status,
      };

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      if (updateData.courseId) {
        const courseInstituteId =
          getLoggedInUser(req).role === "super_admin"
            ? String((await Batch.findById(id).select("instituteId"))?.instituteId ?? "")
            : instituteId;

        const course = await Course.findOne({
          _id: updateData.courseId,
          instituteId: courseInstituteId,
        });

        if (!course) {
          res.status(400).json({ error: "Selected course does not belong to this institute" });
          return;
        }
      }

      const batch = await Batch.findOneAndUpdate(filter, updateData, {
        new: true,
        runValidators: true,
      });

      if (!batch) {
        res.status(404).json({ error: "Batch not found" });
        return;
      }

      res.json(await fmtBatch(batch));
    } catch (error: any) {
      console.error("BATCH UPDATE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to update batch" });
    }
  }
);

router.delete(
  "/batches/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);
      const { filter, instituteId } = buildInstituteFilter(req, id);

      if (!filter && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const batch = await Batch.findOneAndDelete(filter);

      if (!batch) {
        res.status(404).json({ error: "Batch not found" });
        return;
      }

      res.sendStatus(204);
    } catch (error: any) {
      console.error("BATCH DELETE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to delete batch" });
    }
  }
);

router.post(
  "/batches/:id/students",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const id = getRouteId(req);
      const { studentId } = req.body;

      if (!studentId) {
        res.status(400).json({ error: "studentId is required" });
        return;
      }

      const { filter, instituteId } = buildInstituteFilter(req, id);

      if (!filter && !instituteId) {
        res.status(403).json({ error: "Your account is not linked to an institute" });
        return;
      }

      const batch = await Batch.findOne(filter);

      if (!batch) {
        res.status(404).json({ error: "Batch not found" });
        return;
      }

      const student = await Student.findOne({
        _id: studentId,
        instituteId: String(batch.instituteId),
      });

      if (!student) {
        res.status(400).json({ error: "Student does not belong to this institute" });
        return;
      }

      const updatedBatch = await Batch.findByIdAndUpdate(
        batch._id,
        { $addToSet: { studentIds: studentId } },
        { new: true }
      );

      res.json(await fmtBatch(updatedBatch));
    } catch (error: any) {
      console.error("BATCH STUDENT ADD ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to add student to batch" });
    }
  }
);

export default router;
