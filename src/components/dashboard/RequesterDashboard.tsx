import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, AlertCircle, DollarSign, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  created_at: string;
}

export function RequesterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    open: 0,
    assigned: 0,
    completed: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user]);

  const fetchMyTasks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      setTasks(data || []);
      
      // Calculate stats
      const openCount = data?.filter(t => t.status === "open").length || 0;
      const assignedCount = data?.filter(t => t.status === "assigned").length || 0;
      const completedCount = data?.filter(t => t.status === "completed").length || 0;
      const totalSpent = data?.filter(t => t.status === "completed")
        .reduce((sum, t) => sum + Number(t.bounty_amount), 0) || 0;
      
      setStats({ open: openCount, assigned: assignedCount, completed: completedCount, totalSpent });
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <Clock className="h-4 w-4 text-category-general" />;
      case "assigned": return <AlertCircle className="h-4 w-4 text-category-auto" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-accent" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      open: "secondary",
      assigned: "default",
      completed: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Requester Dashboard</h1>
          <p className="text-muted-foreground">Manage your verification requests</p>
        </div>
        <Button onClick={() => navigate("/create-task")} className="hidden sm:flex">
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Tasks</p>
                <p className="text-3xl font-bold text-foreground">{stats.open}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-category-general-light flex items-center justify-center">
                <Clock className="h-6 w-6 text-category-general" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-foreground">{stats.assigned}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-category-auto-light flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-category-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground">{stats.completed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-3xl font-bold text-foreground">${stats.totalSpent}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile CTA */}
      <Button onClick={() => navigate("/create-task")} className="w-full sm:hidden">
        <Plus className="mr-2 h-4 w-4" />
        Create New Task
      </Button>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>Track and manage your verification requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You haven't created any tasks yet</p>
              <Button onClick={() => navigate("/create-task")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(task.status)}
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-foreground">${task.bounty_amount}</p>
                      <p className="text-xs text-muted-foreground capitalize">{task.category}</p>
                    </div>
                    {getStatusBadge(task.status)}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {tasks.length > 5 && (
                <Button variant="outline" className="w-full">
                  View All {tasks.length} Tasks
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
