import { useListAdmissions, useCreateAdmission } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListAdmissionsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

const admissionSchema = z.object({
  studentName: z.string().min(2),
  parentName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  courseInterest: z.string().min(2),
  source: z.enum(["walk-in", "website", "referral", "social-media", "other"]),
});

export default function Admissions() {
  const [search, setSearch] = useState("");
  const { data: enquiries, isLoading } = useListAdmissions();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createAdmission = useCreateAdmission();

  const form = useForm<z.infer<typeof admissionSchema>>({
    resolver: zodResolver(admissionSchema),
    defaultValues: { studentName: "", parentName: "", phone: "", courseInterest: "", source: "walk-in" },
  });

  const onSubmit = (values: z.infer<typeof admissionSchema>) => {
    createAdmission.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListAdmissionsQueryKey() });
      }
    });
  };

  const filteredEnquiries = enquiries?.filter(e => e.studentName.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admissions Pipeline</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Enquiry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Admission Enquiry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="studentName" render={({ field }) => (
                  <FormItem><FormLabel>Student Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="parentName" render={({ field }) => (
                  <FormItem><FormLabel>Parent Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="courseInterest" render={({ field }) => (
                    <FormItem><FormLabel>Course Interest</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="walk-in">Walk In</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="social-media">Social Media</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createAdmission.isPending}>
                  {createAdmission.isPending ? "Saving..." : "Save Enquiry"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads by name or phone..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading pipeline...</TableCell></TableRow>
              ) : filteredEnquiries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No enquiries found</TableCell></TableRow>
              ) : (
                filteredEnquiries.map(enquiry => (
                  <TableRow key={enquiry.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {enquiry.createdAt ? format(new Date(enquiry.createdAt), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        {enquiry.studentName}
                      </div>
                      <div className="text-xs text-muted-foreground">P: {enquiry.parentName}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {enquiry.phone}
                    </TableCell>
                    <TableCell className="font-medium">{enquiry.courseInterest}</TableCell>
                    <TableCell>
                      <Badge variant={
                        enquiry.status === 'converted' ? 'default' : 
                        enquiry.status === 'lost' ? 'destructive' : 
                        enquiry.status === 'hot' ? 'secondary' : 'outline'
                      } className="capitalize">
                        {enquiry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}