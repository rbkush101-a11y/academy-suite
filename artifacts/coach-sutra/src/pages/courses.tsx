import { useListCourses, useCreateCourse, useUpdateCourse, useDeleteCourse, getListCoursesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, BookOpen, Clock, IndianRupee, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const courseSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  duration: z.string().min(2),
  fees: z.coerce.number().min(0),
});

type CourseForm = z.infer<typeof courseSchema>;

export default function Courses() {
  const { data: courses, isLoading } = useListCourses();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const queryClient = useQueryClient();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: "", description: "", duration: "6 Months", fees: 0 },
  });

  const openAdd = () => { setEditTarget(null); form.reset({ name: "", description: "", duration: "6 Months", fees: 0 }); setOpen(true); };
  const openEdit = (course: any) => { setEditTarget(course); form.reset({ name: course.name, description: course.description, duration: course.duration, fees: course.fees }); setOpen(true); };

  const onSubmit = (values: CourseForm) => {
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() }); setOpen(false); };
    if (editTarget) {
      updateCourse.mutate({ id: editTarget.id, data: values }, { onSuccess: invalidate });
    } else {
      createCourse.mutate({ data: values }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this course?")) return;
    deleteCourse.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() }) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Course</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit Course" : "Add New Course"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Course Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem><FormLabel>Duration</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fees" render={({ field }) => (
                  <FormItem><FormLabel>Fees (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full" disabled={createCourse.isPending || updateCourse.isPending}>
                {createCourse.isPending || updateCourse.isPending ? "Saving..." : editTarget ? "Update Course" : "Save Course"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12">Loading courses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map(course => (
            <Card key={course.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2 flex-1 min-w-0">
                    <BookOpen className="h-5 w-5 text-primary shrink-0" />
                    <span className="truncate">{course.name}</span>
                  </CardTitle>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(course)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(course.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Duration</div>
                  <div className="font-medium">{course.duration}</div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><IndianRupee className="h-4 w-4" /> Fees</div>
                  <div className="font-medium font-mono text-primary text-base">₹{course.fees.toLocaleString()}</div>
                </div>
                <Badge variant={course.status === "active" ? "default" : "secondary"} className="w-full justify-center">
                  {course.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {courses?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No courses created yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
