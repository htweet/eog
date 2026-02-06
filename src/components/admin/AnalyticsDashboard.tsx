import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  dailyTasks: { date: string; count: number }[];
  categoryDistribution: { name: string; value: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  metrics: {
    avgCompletionTime: number;
    successRate: number;
    avgBounty: number;
    activeUsers: number;
    weeklyGrowth: number;
  };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({
    dailyTasks: [],
    categoryDistribution: [],
    statusBreakdown: [],
    metrics: {
      avgCompletionTime: 0,
      successRate: 0,
      avgBounty: 0,
      activeUsers: 0,
      weeklyGrowth: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all tasks for analytics
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });

      if (!tasks) return;

      // Calculate daily tasks (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const dailyTasks = last7Days.map((date) => ({
        date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        count: tasks.filter(
          (t) => t.created_at?.split("T")[0] === date
        ).length,
      }));

      // Category distribution
      const categories = ["auto", "realestate", "electronics", "general"];
      const categoryDistribution = categories.map((cat) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: tasks.filter((t) => t.category === cat).length,
      }));

      // Status breakdown
      const statuses = [
        { name: "Open", key: "open", color: "hsl(var(--primary))" },
        { name: "Assigned", key: "assigned", color: "hsl(45, 100%, 51%)" },
        { name: "Pending", key: "pending_review", color: "hsl(200, 100%, 50%)" },
        { name: "Completed", key: "completed", color: "hsl(142, 76%, 36%)" },
        { name: "Disputed", key: "disputed", color: "hsl(0, 84%, 60%)" },
      ];

      const statusBreakdown = statuses.map((s) => ({
        name: s.name,
        value: tasks.filter((t) => t.status === s.key).length,
        color: s.color,
      }));

      // Calculate metrics
      const completedTasks = tasks.filter((t) => t.status === "completed");
      const successRate = tasks.length > 0 
        ? (completedTasks.length / tasks.length) * 100 
        : 0;
      
      const avgBounty = tasks.length > 0
        ? tasks.reduce((sum, t) => sum + t.bounty_amount, 0) / tasks.length
        : 0;

      // Get active users (users who created or completed tasks)
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Calculate weekly growth (compare this week to last week)
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 14);

      const thisWeekTasks = tasks.filter(
        (t) => new Date(t.created_at || "") >= thisWeekStart
      ).length;
      const lastWeekTasks = tasks.filter(
        (t) =>
          new Date(t.created_at || "") >= lastWeekStart &&
          new Date(t.created_at || "") < thisWeekStart
      ).length;

      const weeklyGrowth = lastWeekTasks > 0
        ? ((thisWeekTasks - lastWeekTasks) / lastWeekTasks) * 100
        : thisWeekTasks > 0 ? 100 : 0;

      setData({
        dailyTasks,
        categoryDistribution,
        statusBreakdown,
        metrics: {
          avgCompletionTime: 24, // Placeholder - would need timestamps
          successRate,
          avgBounty,
          activeUsers: activeUsers || 0,
          weeklyGrowth,
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Tasks completed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Bounty</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{data.metrics.avgBounty.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per task</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
            {data.metrics.weeklyGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.metrics.weeklyGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
              {data.metrics.weeklyGrowth >= 0 ? "+" : ""}{data.metrics.weeklyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Compared to last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Tasks Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tasks This Week
            </CardTitle>
            <CardDescription>Number of tasks created per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyTasks}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Task Status Distribution
            </CardTitle>
            <CardDescription>Current task status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
          <CardDescription>Tasks by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
