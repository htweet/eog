import { useState, useEffect } from "react";
import { Flame, Loader2 } from "lucide-react";
import { BountyCard } from "./BountyCard";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
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

export function ActiveBountiesSection() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error) {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const getCategoryType = (category: string): "auto" | "realestate" | "electronics" | "general" => {
    if (["auto", "realestate", "electronics", "general"].includes(category)) {
      return category as "auto" | "realestate" | "electronics" | "general";
    }
    return "general";
  };

  const getUrgency = (date: string): "low" | "medium" | "high" => {
    const now = new Date();
    const created = new Date(date);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return "high";
    if (diffHours < 6) return "medium";
    return "low";
  };

  return (
    <section className="py-12">
      <div className="container">
        {/* Section header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Active Bounties Near You
              </h2>
            </div>
            <p className="text-muted-foreground">
              Pick up a task and start earning today
            </p>
          </div>
          <Button 
            variant="outline" 
            className="hidden sm:flex"
            onClick={() => navigate("/browse")}
          >
            View all bounties
          </Button>
        </div>

        {/* Bounties list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No active bounties at the moment
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <BountyCard
                  title={task.title}
                  location={task.address}
                  distance="--"
                  price={task.bounty_amount}
                  category={getCategoryType(task.category)}
                  timePosted={getTimeAgo(task.created_at)}
                  urgency={getUrgency(task.created_at)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Mobile view all button */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/browse")}
          >
            View all bounties
          </Button>
        </div>
      </div>
    </section>
  );
}
