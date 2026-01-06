import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReviewsList } from "@/components/review/ReviewsList";
import { MapPin, DollarSign, Star, CheckCircle, Clock, Briefcase, TrendingUp, Eye } from "lucide-react";
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

interface ProfileData {
  trust_score: number | null;
  wallet_balance: number | null;
  is_verified: boolean | null;
}

export function VoucherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assigned: 0,
    completed: 0,
    totalEarned: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch voucher's assigned and completed tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("voucher_id", user.id)
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
    } else {
      setMyTasks(tasksData || []);
      
      const assignedCount = tasksData?.filter(t => t.status === "assigned").length || 0;
      const completedCount = tasksData?.filter(t => t.status === "completed").length || 0;
      const totalEarned = tasksData?.filter(t => t.status === "completed")
        .reduce((sum, t) => sum + Number(t.bounty_amount), 0) || 0;
      
      setStats({ assigned: assignedCount, completed: completedCount, totalEarned });
    }

    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("trust_score, wallet_balance, is_verified")
      .eq("id", user.id)
      .single();

    if (!profileError) {
      setProfile(profileData);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      assigned: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      pending_review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      completed: "bg-primary/10 text-primary border-primary/20",
    };
    return (
      <Badge className={colors[status] || ""} variant="outline">
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  // Include pending_review in active tasks
  const activeTasks = myTasks.filter(t => t.status === "assigned" || t.status === "pending_review");

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Voucher Dashboard</h1>
          <p className="text-muted-foreground">Find tasks and start earning</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="hidden sm:flex">
          <MapPin className="mr-2 h-4 w-4" />
          Browse Tasks
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
                <p className="text-3xl font-bold text-foreground">{stats.assigned}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-category-auto-light flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-category-auto" />
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
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold text-foreground">${stats.totalEarned}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trust Score</p>
                <p className="text-3xl font-bold text-foreground">{profile?.trust_score?.toFixed(1) || "5.0"}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-category-general-light flex items-center justify-center">
                <Star className="h-6 w-6 text-category-general" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balance Card */}
      <Card className="gradient-trust text-accent-foreground">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-accent-foreground/80">Available Balance</p>
              <p className="text-4xl font-bold">${profile?.wallet_balance?.toFixed(2) || "0.00"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile CTA */}
      <Button onClick={() => navigate("/browse")} className="w-full sm:hidden">
        <MapPin className="mr-2 h-4 w-4" />
        Browse Available Tasks
      </Button>

      {/* My Active Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Active Tasks</CardTitle>
          <CardDescription>Tasks you're currently working on</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : activeTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active tasks</p>
              <Button onClick={() => navigate("/browse")}>
                <MapPin className="mr-2 h-4 w-4" />
                Find Tasks to Complete
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/task/${task.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {task.status === "pending_review" ? (
                      <Eye className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-category-auto" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {task.address}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-accent">${task.bounty_amount}</p>
                      <p className="text-xs text-muted-foreground capitalize">{task.category}</p>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed */}
      {myTasks.filter(t => t.status === "completed").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed</CardTitle>
            <CardDescription>Your finished tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myTasks.filter(t => t.status === "completed").slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent">+${task.bounty_amount}</p>
                    {getStatusBadge(task.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews Section */}
      {stats.completed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Recent Reviews
            </CardTitle>
            <CardDescription>Feedback from your completed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewsList userId={user?.id} limit={3} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
