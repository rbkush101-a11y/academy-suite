import { useListSalaries, useCreateSalary, useListStaff } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Briefcase, IndianRupee } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListSalariesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const salarySchema = z.object({
  staffId: z.string().min(1),
  month: z.string().min(1),
  basicSalary: z.coerce.number().min(0),
  allowances: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().optional(),
});

export default function HR() {
  const { data: salaries, isLoading } = useListSalaries();
  const { data: staff } = useListStaff();
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const createSalary = useCreateSalary();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const form = useForm<z.infer<typeof salarySchema>>({
    resolver: zodResolver(salarySchema),
    defaultValues: { staffId: "", month: currentMonth, basicSalary: 0, allowances: 0, deductions: 0, paymentMethod: "bank_transfer" },
  });

  const onSubmit = (values: z.infer<typeof salarySchema>) => {
    createSalary.mutate({ data: values }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListSalariesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">HR & Payroll</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Process Salary</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Salary</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="staffId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      const selectedStaff = staff?.find(s => s.id === val);
                      if (selectedStaff) {
                        form.setValue('basicSalary', selectedStaff.salary);
                      }
                    }} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - {s.role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="month" render={({ field }) => (
                  <FormItem><FormLabel>Month (YYYY-MM)</FormLabel><FormControl><Input type="month" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="basicSalary" render={({ field }) => (
                    <FormItem><FormLabel>Basic (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="allowances" render={({ field }) => (
                    <FormItem><FormLabel>Allowances</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="deductions" render={({ field }) => (
                    <FormItem><FormLabel>Deductions</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createSalary.isPending}>
                  {createSalary.isPending ? "Processing..." : "Process Salary"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Salary Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading records...</TableCell></TableRow>
              ) : salaries?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No salary records found</TableCell></TableRow>
              ) : (
                salaries?.map(salary => (
                  <TableRow key={salary.id}>
                    <TableCell className="font-medium">{salary.staffName}</TableCell>
                    <TableCell>{salary.month}</TableCell>
                    <TableCell className="font-mono text-primary font-bold">₹{salary.netSalary?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={salary.status === 'paid' ? 'default' : 'secondary'}>{salary.status}</Badge>
                    </TableCell>
                    <TableCell>{salary.paidDate ? format(new Date(salary.paidDate), 'MMM d, yyyy') : '-'}</TableCell>
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