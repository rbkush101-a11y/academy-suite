import { useGetFinanceSummary, useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

export default function Finance() {
  const { data: summary, isLoading: isLoadingSummary } = useGetFinanceSummary();
  const { data: payments, isLoading: isLoadingPayments } = useListPayments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                <h3 className="text-2xl font-bold">₹{summary?.totalRevenue?.toLocaleString() || 0}</h3>
              </div>
              <div className="p-3 bg-green-100 text-green-700 rounded-xl dark:bg-green-900/30 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Fees</p>
                <h3 className="text-2xl font-bold">₹{summary?.totalPending?.toLocaleString() || 0}</h3>
              </div>
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Overdue Amount</p>
                <h3 className="text-2xl font-bold text-destructive">₹{summary?.totalOverdue?.toLocaleString() || 0}</h3>
              </div>
              <div className="p-3 bg-red-100 text-red-700 rounded-xl dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Collection Rate</p>
                <h3 className="text-2xl font-bold">{summary?.collectionRate || 0}%</h3>
              </div>
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl dark:bg-purple-900/30 dark:text-purple-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayments ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading payments...</TableCell></TableRow>
                ) : payments?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No recent payments</TableCell></TableRow>
                ) : (
                  payments?.slice(0, 10).map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.studentName}</TableCell>
                      <TableCell className="font-mono">₹{payment.amount}</TableCell>
                      <TableCell>{format(new Date(payment.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.status === 'paid' ? 'default' : 
                          payment.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{payment.paymentMethod || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}