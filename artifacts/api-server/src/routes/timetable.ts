import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Timetable } from "../models/Timetable";
import { Subject } from "../models/Subject";
import { Batch } from "../models/Batch";

const router: IRouter = Router();

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function formatEntry(entry: any) {
  const batch =
    entry.batchId && typeof entry.batchId === "object" ? entry.batchId : null;
  const subject =
    entry.subjectId && typeof entry.subjectId === "object" ? entry.subjectId : null;
  const teacher =
    entry.teacherId && typeof entry.teacherId === "object" ? entry.teacherId : null;

  return {
    id: String(entry._id),
    batchId: batch?._id ? String(batch._id) : String(entry.batchId ?? ""),
    batchName: batch?.name ?? "",
    subjectId: subject?._id ? String(subject._id) : String(entry.subjectId ?? ""),
    subjectName: subject?.name ?? "",
    teacherId: teacher?._id ? String(teacher._id) : String(entry.teacherId ?? ""),
    teacherName: teacher?.name ?? "",
    day: entry.day ?? "",
    startTime: entry.startTime ?? "",
    endTime: entry.endTime ?? "",
    room: entry.room ?? "",
    createdAt: entry.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

async function populatedTimetableEntry(id: string) {
  return Timetable.findById(id)
    .populate("batchId", "name courseId")
    .populate("subjectId", "name code courseId teacherId")
    .populate("teacherId", "name");
}

router.get(
  "/timetable",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const batchId = toText(req.query.batchId);
      const filter: any = batchId ? { batchId } : {};

      const entries = await Timetable.find(filter)
        .populate("batchId", "name courseId")
        .populate("subjectId", "name code courseId teacherId")
        .populate("teacherId", "name")
        .sort({ day: 1, startTime: 1 });

      res.json(entries.map(formatEntry));
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to load timetable entries.",
      });
    }
  }
);

router.post(
  "/timetable",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const batchId = toText(req.body?.batchId);
      const subjectId = toText(req.body?.subjectId);
      const day = toText(req.body?.day);
      const startTime = toText(req.body?.startTime);
      const endTime = toText(req.body?.endTime);
      const room = toText(req.body?.room);

      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      if (!batchId || !subjectId || !day || !startTime || !endTime) {
        res.status(400).json({
          error: "Batch, Subject, Day, Start Time and End Time are required.",
        });
        return;
      }

      if (!validDays.includes(day)) {
        res.status(400).json({ error: "Please select a valid day." });
        return;
      }

      if (endTime <= startTime) {
        res.status(400).json({
          error: "End Time must be later than Start Time.",
        });
        return;
      }

      const duplicateEntry = await Timetable.findOne({
        batchId,
        subjectId,
        day,
        startTime,
        endTime,
      });

      if (duplicateEntry) {
        res.status(409).json({
          error: "Same Batch, Subject, Day and Time ki timetable entry pehle se saved hai.",
        });
        return;
      }

      const [batch, subject] = await Promise.all([
        Batch.findById(batchId),
        Subject.findById(subjectId),
      ]);

      if (!batch) {
        res.status(404).json({ error: "Selected batch not found." });
        return;
      }

      if (!subject) {
        res.status(404).json({ error: "Selected subject not found." });
        return;
      }

      if (String(batch.courseId) !== String(subject.courseId)) {
        res.status(400).json({
          error: "Selected Batch and Subject must belong to the same Course.",
        });
        return;
      }

      const entry = await Timetable.create({
        batchId,
        subjectId,
        teacherId: subject.teacherId || undefined,
        day,
        startTime,
        endTime,
        room,
      });

      const populated = await populatedTimetableEntry(String(entry._id));
      res.status(201).json(formatEntry(populated));
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to save timetable entry.",
      });
    }
  }
);

router.patch(
  "/timetable/:id",
  authenticate,
  authorize("super_admin", "institute_admin", "staff"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await Timetable.findById(id);

      if (!existing) {
        res.status(404).json({ error: "Timetable entry not found." });
        return;
      }

      const updates: any = {};
      const allowedFields = ["batchId", "subjectId", "day", "startTime", "endTime", "room"];

      for (const field of allowedFields) {
        if (req.body?.[field] !== undefined) {
          updates[field] = toText(req.body[field]);
        }
      }

      const finalBatchId = updates.batchId || String(existing.batchId);
      const finalSubjectId = updates.subjectId || String(existing.subjectId);
      const finalStartTime = updates.startTime || existing.startTime;
      const finalEndTime = updates.endTime || existing.endTime;

      if (finalEndTime <= finalStartTime) {
        res.status(400).json({ error: "End Time must be later than Start Time." });
        return;
      }

      const [batch, subject] = await Promise.all([
        Batch.findById(finalBatchId),
        Subject.findById(finalSubjectId),
      ]);

      if (!batch || !subject) {
        res.status(400).json({ error: "Valid Batch and Subject are required." });
        return;
      }

      if (String(batch.courseId) !== String(subject.courseId)) {
        res.status(400).json({
          error: "Selected Batch and Subject must belong to the same Course.",
        });
        return;
      }

      updates.teacherId = subject.teacherId || undefined;

      await Timetable.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      const populated = await populatedTimetableEntry(id);
      res.json(formatEntry(populated));
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to update timetable entry.",
      });
    }
  }
);

router.delete(
  "/timetable/:id",
  authenticate,
  authorize("super_admin", "institute_admin"),
  async (req, res): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await Timetable.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ error: "Timetable entry not found." });
        return;
      }

      res.json({ message: "Timetable entry deleted successfully." });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message ?? "Unable to delete timetable entry.",
      });
    }
  }
);

export default router;
