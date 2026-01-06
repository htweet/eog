import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  requester_id: string;
  voucher_id: string | null;
  checklist: unknown;
}

export function useTasks(status?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [status]);

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase.from("tasks").select("*");

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      setError(error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  return { tasks, loading, error, refetch: fetchTasks };
}

export function useTaskStats() {
  const [stats, setStats] = useState({
    auto: 0,
    realestate: 0,
    electronics: 0,
    general: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("category")
      .eq("status", "open");

    if (!error && data) {
      const categoryCount = data.reduce(
        (acc, task) => {
          acc[task.category as keyof typeof acc] = (acc[task.category as keyof typeof acc] || 0) + 1;
          acc.total += 1;
          return acc;
        },
        { auto: 0, realestate: 0, electronics: 0, general: 0, total: 0 }
      );
      setStats(categoryCount);
    }
    setLoading(false);
  };

  return { stats, loading, refetch: fetchStats };
}
