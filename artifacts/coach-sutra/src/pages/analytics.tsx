import { useGetPerformanceAnalytics, useGetToppers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export default function Analytics() {
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetPerformanceAnalytics();
  const { data: toppers, isLoading: isLoadingToppers } = useGetToppers();

  const gradeData = analytics?.gradeDistribution ? Object.entries(analytics.gradeDistribution).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
                <h3 className="text-3xl font-bold mt-2">{analytics?.averageAttendance || 0}%</h3>
              </div>
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Marks</p>
                <h3 className="text-3xl font-bold mt-2">{analytics?.averageMarks || 0}%</h3>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pass Percentage</p>
                <h3 className="text-3xl font-bold mt-2 text-green-600">{analytics?.passPercentage || 0}%</h3>
              </div>
              <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isLoadingAnalytics ? (
                <div className="w-full h-full flex items-center justify-center">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isLoadingAnalytics ? (
                <div className="w-full h-full flex items-center justify-center">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.monthlyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Institute Toppers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-center">Percentage</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingToppers ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading toppers...</TableCell></TableRow>
                ) : toppers?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No exam data available</TableCell></TableRow>
                ) : (
                  toppers?.map(topper => (
                    <TableRow key={topper.studentId} className={topper.rank <= 3 ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}>
                      <TableCell className="font-bold text-center">
                        {topper.rank === 1 ? '🥇' : topper.rank === 2 ? '🥈' : topper.rank === 3 ? '🥉' : topper.rank}
                      </TableCell>
                      <TableCell className="font-medium">{topper.studentName}</TableCell>
                      <TableCell className="text-center font-mono">{topper.percentage}%</TableCell>
                      <TableCell className="text-right font-bold text-primary">{topper.grade}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}