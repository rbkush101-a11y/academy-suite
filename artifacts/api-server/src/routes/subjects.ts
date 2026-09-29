import { Router, type IRouter } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middlewares/auth";
import { Subject } from "../models/Subject";
import { Course } from "../models/Course";
import { Staff } from "../models/Staff";

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

function fmt(subject: any) {
  const course =
    subject.courseId && typeof subject.courseId === "object"
      ? subject.courseId
      : null;

  const teacher =
    subject.teacherId && typeof subject.teacherId === "object"
      ? subject.teacherId
      : null;

  return {
    id: String(subject._id),
    name: subject.name ?? "",
    code: subject.code ?? "",
    courseId: course?._id
      ? String(course._id)
      : String(subject.courseId ?? ""),
    courseName: course?.name ?? "",
    teacherId: teacher?._id
      ? String(teacher._id)
      : subject.teacherId
        ? String(subject.teacherId)
        : "",
    teacherName: teacher?.name ?? "",
    createdAt:
      subject.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt:
      subject.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

async function findSubject(
  id: string,
  instituteId?: string | null,
) {
  const filter: any = {
    _id: id,
  };

  if (instituteId) {
    filter.instituteId = instituteId;
  }

  return Subject.findOne(filter)
    .populate("courseId", "name")
    .populate("teacherId", "name");
}

/**
 * Verify that a course belongs to the current institute.
 */
async function verifyCourseAccess(
  courseId: string,
  instituteId: string | null,
  isSuperAdmin: boolean,
) {
  if (!isValidObjectId(courseId)) {
    return null;
  }

  const filter: any = {
    _id: courseId,
  };

  if (!isSuperAdmin) {
    if (!instituteId) {
      return null;
    }

    filter.instituteId = instituteId;
  }

  return Course.findOne(filter).select("_id name instituteId");
}

/**
 * Verify that a teacher/staff member belongs to the current institute.
 */
async function verifyTeacherAccess(
  teacherId: string,
  instituteId: string | null,
  isSuperAdmin: boolean,
) {
  if (!isValidObjectId(teacherId)) {
    return null;
  }

  const filter: any = {
    _id: teacherId,
  };

  if (!isSuperAdmin) {
    if (!instituteId) {
      return null;
    }

    filter.instituteId = instituteId;
  }

  return Staff.findOne(filter).select("_id name instituteId");
}

/* =========================================================
   GET SUBJECTS
========================================================= */

router.get(
  "/subjects",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const filter: any = {};

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);
      const courseId = String(
        req.query.courseId ?? "",
      ).trim();

      /*
       * Tenant isolation.
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
       * Optional course filter.
       */
      if (courseId) {
        if (!isValidObjectId(courseId)) {
          res.status(400).json({
            error: "Invalid course ID",
          });
          return;
        }

        /*
         * Make sure the requested course belongs
         * to the current institute.
         */
        const course = await verifyCourseAccess(
          courseId,
          instituteId,
          user.role === "super_admin",
        );

        if (!course) {
          res.status(404).json({
            error: "Course not found",
          });
          return;
        }

        filter.courseId = courseId;
      }

      const subjects = await Subject.find(filter)
        .populate("courseId", "name")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 });

      res.json(subjects.map(fmt));
    } catch (error) {
      console.error("SUBJECT LIST ERROR:", error);

      res.status(500).json({
        error: "Unable to load subjects.",
      });
    }
  },
);

/* =========================================================
   CREATE SUBJECT
========================================================= */

router.post(
  "/subjects",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      const name = String(
        req.body?.name ?? "",
      ).trim();

      const code = String(
        req.body?.code ?? "",
      )
        .trim()
        .toUpperCase();

      const courseId = String(
        req.body?.courseId ?? "",
      ).trim();

      const teacherId = String(
        req.body?.teacherId ?? "",
      ).trim();

      if (!name || !code || !courseId) {
        res.status(400).json({
          error:
            "Subject Name, Subject Code and Course are required.",
        });
        return;
      }

      if (user.role !== "super_admin" && !instituteId) {
        res.status(403).json({
          error:
            "Your account is not linked to an institute",
        });
        return;
      }

      /*
       * Verify course belongs to the same institute.
       */
      const course = await verifyCourseAccess(
        courseId,
        instituteId,
        user.role === "super_admin",
      );

      if (!course) {
        res.status(404).json({
          error:
            "Selected course was not found or does not belong to your institute.",
        });
        return;
      }

      /*
       * If teacher is provided, verify ownership.
       */
      if (teacherId) {
        const teacher = await verifyTeacherAccess(
          teacherId,
          instituteId,
          user.role === "super_admin",
        );

        if (!teacher) {
          res.status(404).json({
            error:
              "Selected teacher was not found or does not belong to your institute.",
          });
          return;
        }
      }

      /*
       * Subject code must be unique inside the institute.
       */
    const duplicateFilter: any = {
      code,
    };

    if (user.role !== "super_admin") {
      if (!instituteId) {
        res.status(403).json({
          error: "Your account is not linked to an institute",
        });
        return;
      }

      duplicateFilter.instituteId = instituteId;
    } else {
      /*
      * Super admin creates subjects for a specific course.
      * The course must have an instituteId.
      */
      if (!course.instituteId) {
        res.status(400).json({
          error: "Selected course is not linked to an institute.",
        });
        return;
      }

      duplicateFilter.instituteId = course.instituteId;
    }

      const existingCode = await Subject.findOne(
        duplicateFilter,
      );

      if (existingCode) {
        res.status(409).json({
          error: `Subject Code "${code}" already exists in this institute. Please use a different Subject Code.`,
        });
        return;
      }

      const subjectInstituteId =
        user.role === "super_admin"
          ? String(course.instituteId)
          : instituteId;

      if (!subjectInstituteId) {
        res.status(400).json({
          error: "Subject could not be linked to an institute.",
        });
        return;
      }

      const subject = await Subject.create({
        name,
        code,
        courseId,
        instituteId: subjectInstituteId,
        ...(teacherId ? { teacherId } : {}),
      });

      const populated = await findSubject(
        String(subject._id),
        subjectInstituteId,
      );

      if (!populated) {
        res.status(404).json({
          error: "Subject created but could not be loaded.",
        });
        return;
      }

      res.status(201).json(fmt(populated));
    } catch (error) {
      console.error("SUBJECT CREATE ERROR:", error);

      res.status(500).json({
        error: "Unable to save subject.",
      });
    }
  },
);

/* =========================================================
   UPDATE SUBJECT
========================================================= */

router.patch(
  "/subjects/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
    "staff",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid subject ID",
        });
        return;
      }

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      /*
       * Find subject with tenant restriction.
       */
      const subjectFilter: any = {
        _id: id,
      };

      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        subjectFilter.instituteId = instituteId;
      }

      const existing = await Subject.findOne(
        subjectFilter,
      );

      if (!existing) {
        res.status(404).json({
          error: "Subject not found.",
        });
        return;
      }

      const updates: any = {};

      if (req.body?.name !== undefined) {
        const name = String(
          req.body.name,
        ).trim();

        if (!name) {
          res.status(400).json({
            error: "Subject Name is required.",
          });
          return;
        }

        updates.name = name;
      }

      if (req.body?.code !== undefined) {
        const code = String(
          req.body.code,
        )
          .trim()
          .toUpperCase();

        if (!code) {
          res.status(400).json({
            error: "Subject Code is required.",
          });
          return;
        }

        const duplicateFilter: any = {
          code,
          _id: { $ne: id },
        };

        if (user.role !== "super_admin") {
          duplicateFilter.instituteId =
            instituteId;
        } else {
          duplicateFilter.instituteId =
            existing.instituteId;
        }

        const duplicate =
          await Subject.findOne(
            duplicateFilter,
          );

        if (duplicate) {
          res.status(409).json({
            error: `Subject Code "${code}" already exists in this institute. Please use a different Subject Code.`,
          });
          return;
        }

        updates.code = code;
      }

      if (req.body?.courseId !== undefined) {
        const courseId = String(
          req.body.courseId,
        ).trim();

        if (!courseId) {
          res.status(400).json({
            error: "Course is required.",
          });
          return;
        }

        const course =
          await verifyCourseAccess(
            courseId,
            instituteId,
            user.role === "super_admin",
          );

        if (!course) {
          res.status(404).json({
            error:
              "Selected course was not found or does not belong to your institute.",
          });
          return;
        }

        /*
         * Prevent moving a subject to another institute.
         */
        if (
          user.role !== "super_admin" &&
          String(course.instituteId) !==
            String(instituteId)
        ) {
          res.status(403).json({
            error:
              "You cannot assign a subject to a course from another institute.",
          });
          return;
        }

        updates.courseId = courseId;
      }

      if (req.body?.teacherId !== undefined) {
        const teacherId = String(
          req.body.teacherId ?? "",
        ).trim();

        if (teacherId) {
          const teacher =
            await verifyTeacherAccess(
              teacherId,
              instituteId,
              user.role === "super_admin",
            );

          if (!teacher) {
            res.status(404).json({
              error:
                "Selected teacher was not found or does not belong to your institute.",
            });
            return;
          }

          updates.teacherId = teacherId;
        } else {
          updates.teacherId = null;
        }
      }

      /*
       * Prevent empty PATCH.
       */
      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          error:
            "No valid subject fields were provided for update.",
        });
        return;
      }

      const subject =
        await Subject.findOneAndUpdate(
          subjectFilter,
          updates,
          {
            new: true,
            runValidators: true,
          },
        )
          .populate("courseId", "name")
          .populate("teacherId", "name");

      if (!subject) {
        res.status(404).json({
          error: "Subject not found.",
        });
        return;
      }

      res.json(fmt(subject));
    } catch (error) {
      console.error("SUBJECT UPDATE ERROR:", error);

      res.status(500).json({
        error: "Unable to update subject.",
      });
    }
  },
);

/* =========================================================
   DELETE SUBJECT
========================================================= */

router.delete(
  "/subjects/:id",
  authenticate,
  authorize(
    "super_admin",
    "institute_admin",
  ),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          error: "Invalid subject ID",
        });
        return;
      }

      const user = getLoggedInUser(req);
      const instituteId = getInstituteIdForUser(req);

      const filter: any = {
        _id: id,
      };

      /*
       * Tenant isolation.
       */
      if (user.role !== "super_admin") {
        if (!instituteId) {
          res.status(403).json({
            error:
              "Your account is not linked to an institute",
          });
          return;
        }

        filter.instituteId = instituteId;
      }

      const subject =
        await Subject.findOneAndDelete(filter);

      if (!subject) {
        res.status(404).json({
          error: "Subject not found.",
        });
        return;
      }

      res.json({
        message:
          "Subject deleted successfully.",
      });
    } catch (error) {
      console.error("SUBJECT DELETE ERROR:", error);

      res.status(500).json({
        error: "Unable to delete subject.",
      });
    }
  },
);

export default router;