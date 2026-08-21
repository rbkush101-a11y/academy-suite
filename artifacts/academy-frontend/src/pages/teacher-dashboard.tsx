import { Card, CardContent } from "@/components/ui/card";

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
      <Card>
        <CardContent className="p-6">
          Teacher ke batches, attendance, homework aur marks yahan dikhenge.
        </CardContent>
      </Card>
    </div>
  );
}