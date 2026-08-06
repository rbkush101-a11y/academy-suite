import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Course } from "../models/Course";

const router: IRouter = Router();

function getLoggedInUser(req: any) {
  return req.user;
}

function getInstituteIdForUser(req: any): string | null {
  const user = getLoggedInUser(req);
  if (user?.role === "super_admin") return null;
  return user?.instituteId ? String(user.instituteId) : null;
}

function fmt(course: any) {
  return {
    id: String(course._id),
    name: course.name,
    instituteId: course.instituteId ? String(course.instituteId) : null,
    description: course.description,
    duration: course.duration,
    fees: course.fees,
    courseType: course.courseType ?? "academic",
    status: course.status,
    createdAt: course.createdAt.toISOString(),
  };
}

function cleanCourseBody(body: any) {
  const allowedFields = ["name", "description", "duration", "fees", "courseType", "status"];
  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  return data;
}

router.get(
  "/courses",
  authenticate,
  authorize("super_admin", "institute_admin", "teacher", "staff", "student"),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {};
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const courseType = String(req.query.courseType ?? "");

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({ error: "Your account is not linked to an institute" });
          return;
        }
        filter.instituteId = instituteId;
      }

      if (courseType === "academic" || courseType === "computer") {
        filter.courseType = courseType;
      }

      const courses = await Course.find(filter).sort({ createdAt: -1 });
      res.json(courses.map(fmt));
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Unable to load courses" });
    }
  }
);

router.post(
  "/courses",
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
        res.status(400).json({ error: "instituteId is required to create a course" });
        return;
      }

      const data = cleanCourseBody(req.body);

      if (!data.name || !data.description || !data.duration || data.fees === undefined) {
        res.status(400).json({ error: "Course name, description, duration and fees are required." });
        return;
      }

      if (data.courseType !== "academic" && data.courseType !== "computer") {
        res.status(400).json({ error: "Please select Academic or Computer course type." });
        return;
      }

      const course = await Course.create({ ...data, instituteId });
      res.status(201).json(fmt(course));
    } catch (error: any) {
      console.error("COURSE CREATE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to create course" });
    }
  }
);

router.patch(
  "/courses/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
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

      const updateData = cleanCourseBody(req.body);

      if (updateData.courseType && updateData.courseType !== "academic" && updateData.courseType !== "computer") {
        res.status(400).json({ error: "Invalid course type." });
        return;
      }

      const course = await Course.findOneAndUpdate(filter, updateData, {
        new: true,
        runValidators: true,
      });

      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      res.json(fmt(course));
    } catch (error: any) {
      console.error("COURSE UPDATE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to update course" });
    }
  }
);

router.delete(
  "/courses/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
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

      const course = await Course.findOneAndDelete(filter);

      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      res.sendStatus(204);
    } catch (error: any) {
      console.error("COURSE DELETE ERROR:", error);
      res.status(500).json({ error: error?.message ?? "Unable to delete course" });
    }
  }
);

export default router;
