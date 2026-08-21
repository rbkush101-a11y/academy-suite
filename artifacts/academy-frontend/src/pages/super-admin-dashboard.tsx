import { Card, CardContent } from "@/components/ui/card";

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
      <Card>
        <CardContent className="p-6">
          Institutes, plans aur global analytics yahan dikhenge.
        </CardContent>
      </Card>
    </div>
  );
}