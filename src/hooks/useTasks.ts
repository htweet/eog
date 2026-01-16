import { useState, useEffect, useCallback } from "react";
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

  const fetchTasks = useCallback(async () => {
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
  }, [status]);

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Task realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            // Only add if status matches filter or no filter
            if (!status || newTask.status === status) {
              setTasks(prev => [newTask, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks(prev => {
              // If we have a status filter and the updated task no longer matches, remove it
              if (status && updatedTask.status !== status) {
                return prev.filter(t => t.id !== updatedTask.id);
              }
              // Otherwise update or add the task
              const existingIndex = prev.findIndex(t => t.id === updatedTask.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = updatedTask;
                return updated;
              }
              // Task newly matches filter, add it
              if (!status || updatedTask.status === status) {
                return [updatedTask, ...prev];
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as Task;
            setTasks(prev => prev.filter(t => t.id !== deletedTask.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, fetchTasks]);

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

  const fetchStats = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes for stats
    const channel = supabase
      .channel('tasks-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          // Refetch stats on any change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// Hook for a single task with realtime updates
export function useTask(taskId: string | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      setError(error);
    } else {
      setTask(data);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();

    if (!taskId) return;

    // Subscribe to realtime changes for this specific task
    const channel = supabase
      .channel(`task-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          console.log('Task updated:', payload);
          setTask(payload.new as Task);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchTask]);

  return { task, loading, error, refetch: fetchTask };
}
