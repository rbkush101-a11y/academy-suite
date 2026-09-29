import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
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
    createdAt: course.createdAt?.toISOString?.() ?? null,
  };
}

function cleanCourseBody(body: any) {
  const allowedFields = [
    "name",
    "description",
    "duration",
    "fees",
    "courseType",
    "status",
  ];

  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body?.[field] !== undefined) {
      data[field] = body[field];
    }
  }

  return data;
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

function isValidCourseType(courseType: unknown): boolean {
  return courseType === "academic" || courseType === "computer";
}

/* =========================================================
   GET ALL COURSES
========================================================= */

router.get(
  "/courses",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "teacher",
    "staff",
    "student",
  ),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {};
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const courseType = String(req.query.courseType ?? "").trim();

      /*
       * Every non-super-admin request MUST be restricted
       * to the logged-in user's institute.
       */
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      /*
       * Optional course type filter.
       */
      if (courseType) {
        if (!isValidCourseType(courseType)) {
          res.status(400).json({
            error: "Invalid course type. Use academic or computer.",
          });
          return;
        }

        filter.courseType = courseType;
      }

      const courses = await Course.find(filter).sort({
        createdAt: -1,
      });

      res.json(courses.map(fmt));
    } catch (error) {
      console.error("COURSE LIST ERROR:", error);

      res.status(500).json({
        error: "Unable to load courses",
      });
    }
  },
);

/* =========================================================
   CREATE COURSE
========================================================= */

router.post(
  "/courses",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      let instituteId = getInstituteIdForUser(req);

      /*
       * Super admin can create a course for a selected institute.
       */
      if (user.role === "super_admin") {
        instituteId = req.body?.instituteId
          ? String(req.body.instituteId)
          : null;
      }

      if (!instituteId) {
        res.status(400).json({
          error: "instituteId is required to create a course",
        });
        return;
      }

      if (!Types.ObjectId.isValid(instituteId)) {
        res.status(400).json({
          error: "Invalid instituteId",
        });
        return;
      }

      const data = cleanCourseBody(req.body);

      if (
        !data.name ||
        !data.description ||
        !data.duration ||
        data.fees === undefined
      ) {
        res.status(400).json({
          error:
            "Course name, description, duration and fees are required.",
        });
        return;
      }

      if (!isValidCourseType(data.courseType)) {
        res.status(400).json({
          error:
            "Please select Academic or Computer course type.",
        });
        return;
      }

      const course = await Course.create({
        ...data,
        instituteId,
      });

      res.status(201).json(fmt(course));
    } catch (error) {
      console.error("COURSE CREATE ERROR:", error);

      res.status(500).json({
        error: "Unable to create course",
      });
    }
  },
);

/* =========================================================
   UPDATE COURSE
========================================================= */

router.patch(
  "/courses/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid course ID",
        });
        return;
      }

      const filter: any = {
        _id: id,
      };

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      /*
       * Tenant isolation:
       * Non-super-admin can ONLY update a course
       * belonging to their own institute.
       */
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      const updateData = cleanCourseBody(req.body);

      /*
       * If courseType is being updated, validate it.
       */
      if (
        updateData.courseType !== undefined &&
        !isValidCourseType(updateData.courseType)
      ) {
        res.status(400).json({
          error: "Invalid course type. Use academic or computer.",
        });
        return;
      }

      /*
       * Prevent an empty PATCH request.
       */
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: "No valid course fields were provided for update.",
        });
        return;
      }

      const course = await Course.findOneAndUpdate(
        filter,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!course) {
        res.status(404).json({
          error: "Course not found",
        });
        return;
      }

      res.json(fmt(course));
    } catch (error) {
      console.error("COURSE UPDATE ERROR:", error);

      res.status(500).json({
        error: "Unable to update course",
      });
    }
  },
);

/* =========================================================
   DELETE COURSE
========================================================= */

router.delete(
  "/courses/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid course ID",
        });
        return;
      }

      const filter: any = {
        _id: id,
      };

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      /*
       * Tenant isolation:
       * Non-super-admin can ONLY delete a course
       * belonging to their own institute.
       */
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error: "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      const course = await Course.findOneAndDelete(filter);

      if (!course) {
        res.status(404).json({
          error: "Course not found",
        });
        return;
      }

      res.sendStatus(204);
    } catch (error) {
      console.error("COURSE DELETE ERROR:", error);

      res.status(500).json({
        error: "Unable to delete course",
      });
    }
  },
);

export default router;