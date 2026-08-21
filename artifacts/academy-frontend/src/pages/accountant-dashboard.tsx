import { Card, CardContent } from "@/components/ui/card";

export default function AccountantDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Accountant Dashboard</h1>
      <Card>
        <CardContent className="p-6">
          Fees, expenses, salary aur reports yahan dikhenge.
        </CardContent>
      </Card>
    </div>
  );
}