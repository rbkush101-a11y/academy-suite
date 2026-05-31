import { useListStaff, useCreateStaff, useUpdateStaffMember, useDeleteStaffMember, getListStaffQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Mail, Phone, Briefcase, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  role: z.enum(["teacher", "coordinator", "admin", "accountant", "other"]),
  subject: z.string().optional(),
  salary: z.coerce.number().min(0),
  joinDate: z.string().min(1),
});

type StaffForm = z.infer<typeof staffSchema>;

export default function Staff() {
  const [search, setSearch] = useState("");
  const { data: staff, isLoading } = useListStaff();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const queryClient = useQueryClient();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaffMember();
  const deleteStaff = useDeleteStaffMember();

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", email: "", phone: "", role: "teacher", subject: "", salary: 0, joinDate: new Date().toISOString().split("T")[0] },
  });

  const openAdd = () => { setEditTarget(null); form.reset({ name: "", email: "", phone: "", role: "teacher", subject: "", salary: 0, joinDate: new Date().toISOString().split("T")[0] }); setOpen(true); };
  const openEdit = (member: any) => { setEditTarget(member); form.reset({ name: member.name, email: member.email, phone: member.phone, role: member.role, subject: member.subject ?? "", salary: member.salary, joinDate: member.joinDate }); setOpen(true); };

  const onSubmit = (values: StaffForm) => {
    const invalidate = () => { queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() }); setOpen(false); };
    if (editTarget) {
      updateStaff.mutate({ id: editTarget.id, data: values }, { onSuccess: invalidate });
    } else {
      createStaff.mutate({ data: values }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    deleteStaff.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() }) });
  };

  const filtered = staff?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Staff Directory</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Staff Member</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject (optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="salary" render={({ field }) => (
                  <FormItem><FormLabel>Salary (₹/month)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="joinDate" render={({ field }) => (
                <FormItem><FormLabel>Join Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createStaff.isPending || updateStaff.isPending}>
                {createStaff.isPending || updateStaff.isPending ? "Saving..." : editTarget ? "Update Staff Member" : "Add Staff Member"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name & Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading staff...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No staff members found</TableCell></TableRow>
                ) : filtered.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium">{member.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Briefcase className="h-3 w-3" /><span className="capitalize">{member.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm"><Mail className="h-3 w-3 text-muted-foreground" /> {member.email}</div>
                      <div className="flex items-center gap-2 text-sm mt-1"><Phone className="h-3 w-3 text-muted-foreground" /> {member.phone}</div>
                    </TableCell>
                    <TableCell>{member.subject || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="font-mono text-sm">₹{member.salary?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(member)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(member.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
