import { Router, type IRouter } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { Homework } from "../models/Homework";
import { Batch } from "../models/Batch";
import { Subject } from "../models/Subject";
import { Staff } from "../models/Staff";

const router: IRouter = Router();
const clean = (value: unknown) => String(value ?? "").trim();

async function formatHomework(hw: any) {
  const [batch, subject] = await Promise.all([
    Batch.findById(hw.batchId).select("name courseId"),
    Subject.findById(hw.subjectId).select("name code courseId teacherId"),
  ]);
  const teacher = subject?.teacherId ? await Staff.findById(subject.teacherId).select("name") : null;
  return {
    id: String(hw._id), title: hw.title ?? "", description: hw.description ?? "",
    batchId: String(hw.batchId), batchName: batch?.name ?? "",
    subjectId: String(hw.subjectId), subjectName: subject?.name ?? "",
    teacherId: subject?.teacherId ? String(subject.teacherId) : "", teacherName: teacher?.name ?? "",
    assignedBy: hw.assignedBy ? String(hw.assignedBy) : "", dueDate: hw.dueDate ?? "",
    fileUrl: hw.fileUrl ?? "", status: hw.status ?? "",
    createdAt: hw.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}
async function validate(batchId: string, subjectId: string) {
  const [batch, subject] = await Promise.all([Batch.findById(batchId), Subject.findById(subjectId)]);
  if (!batch) return { error: "Selected batch not found." };
  if (!subject) return { error: "Selected subject not found." };
  if (String(batch.courseId ?? "") !== String(subject.courseId ?? "")) return { error: "Selected Batch and Subject must belong to the same Course." };
  return { batch, subject };
}

router.get("/homework", authenticate, authorize("super_admin","institute_admin","teacher","student","parent"), async (req,res): Promise<void> => {
  try {
    const filter: any = {};
    const batchId = clean(req.query.batchId); const subjectId = clean(req.query.subjectId);
    if (batchId) filter.batchId = batchId; if (subjectId) filter.subjectId = subjectId;
    const list = await Homework.find(filter).sort({ createdAt: -1 });
    res.json(await Promise.all(list.map(formatHomework)));
  } catch (error:any) { res.status(500).json({ error: error?.message ?? "Unable to load homework." }); }
});

router.post("/homework", authenticate, authorize("super_admin","institute_admin","teacher"), async (req,res): Promise<void> => {
  try {
    const title=clean(req.body?.title), description=clean(req.body?.description), batchId=clean(req.body?.batchId), subjectId=clean(req.body?.subjectId), dueDate=clean(req.body?.dueDate), fileUrl=clean(req.body?.fileUrl);
    if (!title || !description || !batchId || !subjectId || !dueDate) { res.status(400).json({error:"Title, Instructions, Batch, Subject and Due Date are required."}); return; }
    const result = await validate(batchId, subjectId);
    if (result.error) { res.status(400).json({error:result.error}); return; }
    const homework = await Homework.create({ title, description, batchId, subjectId, dueDate, fileUrl, assignedBy: result.subject?.teacherId || undefined });
    res.status(201).json(await formatHomework(homework));
  } catch (error:any) { res.status(500).json({ error: error?.message ?? "Unable to publish homework." }); }
});

router.patch("/homework/:id", authenticate, authorize("super_admin","institute_admin","teacher"), async (req,res): Promise<void> => {
  try {
    const id=Array.isArray(req.params.id)?req.params.id[0]:req.params.id;
    const old=await Homework.findById(id); if(!old){res.status(404).json({error:"Homework not found."});return;}
    const updates:any={}; for(const key of ["title","description","batchId","subjectId","dueDate","fileUrl"]){if(req.body?.[key]!==undefined)updates[key]=clean(req.body[key]);}
    const result=await validate(updates.batchId||String(old.batchId),updates.subjectId||String(old.subjectId));
    if(result.error){res.status(400).json({error:result.error});return;}
    updates.assignedBy=result.subject?.teacherId||undefined;
    const homework=await Homework.findByIdAndUpdate(id,updates,{new:true,runValidators:true});
    res.json(await formatHomework(homework));
  } catch(error:any){res.status(500).json({error:error?.message??"Unable to update homework."});}
});

router.delete("/homework/:id", authenticate, authorize("super_admin","institute_admin"), async (req,res): Promise<void> => {
  try {
    const id=Array.isArray(req.params.id)?req.params.id[0]:req.params.id;
    const removed=await Homework.findByIdAndDelete(id); if(!removed){res.status(404).json({error:"Homework not found."});return;}
    res.json({message:"Homework deleted successfully."});
  } catch(error:any){res.status(500).json({error:error?.message??"Unable to delete homework."});}
});

export default router;
