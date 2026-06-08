import { useListAdmissions, useCreateAdmission, useUpdateAdmission, getListAdmissionsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserPlus, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

const admissionSchema = z.object({
  studentName: z.string().min(2),
  parentName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  courseInterest: z.string().min(2),
  source: z.enum(["walk-in", "website", "referral", "social-media", "other"]),
  remarks: z.string().optional(),
});

type AdmissionForm = z.infer<typeof admissionSchema>;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  visited: "bg-purple-100 text-purple-700",
  enrolled: "bg-green-100 text-green-700",
  dropped: "bg-red-100 text-red-700",
};

export default function Admissions() {
  const [search, setSearch] = useState("");
  const { data: enquiries, isLoading } = useListAdmissions();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const queryClient = useQueryClient();
  const createAdmission = useCreateAdmission();
  const updateAdmission = useUpdateAdmission();

  const defaults: AdmissionForm = { studentName: "", parentName: "", phone: "", email: "", courseInterest: "", source: "walk-in", remarks: "" };
  const form = useForm<AdmissionForm>({ resolver: zodResolver(admissionSchema), defaultValues: defaults });

  const openAdd = () => { setEditTarget(null); form.reset(defaults); setOpen(true); };
  const openEdit = (e: any) => {
    setEditTarget(e);
    form.reset({ studentName: e.studentName, parentName: e.parentName, phone: e.phone, email: e.email ?? "", courseInterest: e.courseInterest, source: e.source ?? "walk-in", remarks: e.remarks ?? "" });
    setOpen(true);
  };

  const onSubmit = (values: AdmissionForm) => {
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: getListAdmissionsQueryKey() }); setOpen(false); };
    const payload = { ...values, email: values.email ?? "" };
    if (editTarget) {
      updateAdmission.mutate({ id: editTarget.id, data: payload }, { onSuccess: invalidate });
    } else {
      createAdmission.mutate({ data: payload }, { onSuccess: invalidate });
    }
  };

  const updateStatus = (id: string, status: string) => {
    updateAdmission.mutate({ id, data: { status } as any }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdmissionsQueryKey() }),
    });
  };

  const filtered = enquiries?.filter(e => e.studentName.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admissions Pipeline</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> New Enquiry</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Enquiry" : "Add Admission Enquiry"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="studentName" render={({ field }) => (
                  <FormItem><FormLabel>Student Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="parentName" render={({ field }) => (
                  <FormItem><FormLabel>Parent Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email (optional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="courseInterest" render={({ field }) => (
                  <FormItem><FormLabel>Course Interest</FormLabel><FormControl><Input placeholder="e.g. JEE Mains" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem><FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk In</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social-media">Social Media</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="remarks" render={({ field }) => (
                <FormItem><FormLabel>Remarks (optional)</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createAdmission.isPending || updateAdmission.isPending}>
                {createAdmission.isPending || updateAdmission.isPending ? "Saving..." : editTarget ? "Update Enquiry" : "Save Enquiry"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Course Interest</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No enquiries found</TableCell></TableRow>
              ) : filtered.map(enquiry => (
                <TableRow key={enquiry.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2"><UserPlus className="h-4 w-4 text-muted-foreground" />{enquiry.studentName}</div>
                    <div className="text-xs text-muted-foreground">P: {enquiry.parentName}</div>
                  </TableCell>
                  <TableCell className="text-sm">{enquiry.phone}</TableCell>
                  <TableCell className="font-medium">{enquiry.courseInterest}</TableCell>
                  <TableCell className="capitalize text-sm">{enquiry.source ?? "-"}</TableCell>
                  <TableCell>
                    <Select value={enquiry.status} onValueChange={(v) => updateStatus(enquiry.id, v)}>
                      <SelectTrigger className={`h-7 text-xs font-medium border-0 w-[110px] ${STATUS_COLORS[enquiry.status] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="visited">Visited</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(enquiry)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
