import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, GraduationCap, Calendar, BookOpen, IndianRupee, Bell, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents}
          icon={Users}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Active Batches"
          value={stats?.totalBatches}
          icon={Calendar}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Present Today"
          value={stats?.presentToday}
          icon={CheckCircle2}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Pending Fees"
          value={stats?.pendingFees ? `₹${stats.pendingFees.toLocaleString()}` : 0}
          icon={AlertCircle}
          isLoading={isLoadingStats}
          className="text-destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Institute Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <BriefcaseIcon className="h-4 w-4" />
                    <span className="font-medium">Total Staff</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalStaff || 0}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">Total Courses</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <UserPlusIcon className="h-4 w-4" />
                    <span className="font-medium">Admission Enquiries</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.admissionEnquiries || 0}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <IndianRupee className="h-4 w-4" />
                    <span className="font-medium">Monthly Revenue</span>
                  </div>
                  <div className="text-2xl font-bold">₹{stats?.monthlyRevenue?.toLocaleString() || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start border-b pb-4 last:border-0 last:pb-0">
                    <div className="mt-0.5 p-2 bg-primary/10 text-primary rounded-full">
                      {getActivityIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity to show
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading, className = "" }: any) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <h3 className={`text-3xl font-bold ${className}`}>{value || 0}</h3>
          )}
        </div>
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

import { Briefcase as BriefcaseIcon, UserPlus as UserPlusIcon, DollarSign, FileText } from "lucide-react";

function getActivityIcon(type: string) {
  switch (type) {
    case "admission": return <UserPlusIcon className="h-4 w-4" />;
    case "payment": return <DollarSign className="h-4 w-4" />;
    case "attendance": return <CheckCircle2 className="h-4 w-4" />;
    case "exam": return <FileText className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}