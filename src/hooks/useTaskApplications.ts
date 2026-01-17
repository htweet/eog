import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TaskApplication {
  id: string;
  task_id: string;
  voucher_id: string;
  status: string;
  bid_message: string | null;
  distance_meters: number | null;
  created_at: string;
  voucher?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    trust_score: number | null;
    is_verified: boolean | null;
    voucher_tier: string | null;
  };
}

export function useTaskApplications(taskId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [myApplication, setMyApplication] = useState<TaskApplication | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!taskId) return;

    // Fetch all applications for this task
    const { data, error } = await supabase
      .from("task_applications")
      .select(`
        *,
        voucher:profiles!task_applications_voucher_id_fkey (
          id,
          full_name,
          avatar_url,
          trust_score,
          is_verified,
          voucher_tier
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setApplications(data || []);
      
      // Find my application if I'm a voucher
      if (user) {
        const mine = data?.find((app) => app.voucher_id === user.id);
        setMyApplication(mine || null);
      }
    }

    setLoading(false);
  }, [taskId, user]);

  useEffect(() => {
    if (taskId) {
      fetchApplications();

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`task-applications-${taskId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "task_applications",
            filter: `task_id=eq.${taskId}`,
          },
          () => {
            fetchApplications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [taskId, fetchApplications]);

  const applyToTask = async (bidMessage?: string, distanceMeters?: number) => {
    if (!user || !taskId) return { success: false, error: "Not authenticated" };

    const { error } = await supabase.from("task_applications").insert({
      task_id: taskId,
      voucher_id: user.id,
      bid_message: bidMessage || null,
      distance_meters: distanceMeters || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already applied",
          description: "You have already applied to this task",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit application",
          variant: "destructive",
        });
      }
      return { success: false, error: error.message };
    }

    toast({
      title: "Application submitted!",
      description: "The requester will review your application",
    });

    await fetchApplications();
    return { success: true };
  };

  const withdrawApplication = async () => {
    if (!user || !myApplication) return { success: false };

    const { error } = await supabase
      .from("task_applications")
      .update({ status: "withdrawn" })
      .eq("id", myApplication.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to withdraw application",
        variant: "destructive",
      });
      return { success: false };
    }

    toast({
      title: "Application withdrawn",
      description: "You can reapply later if you change your mind",
    });

    await fetchApplications();
    return { success: true };
  };

  const acceptApplication = async (applicationId: string) => {
    if (!user) return { success: false };

    // Get the application to get voucher_id
    const application = applications.find((app) => app.id === applicationId);
    if (!application) return { success: false };

    // Start transaction: accept this application, reject others, update task
    const { error: updateError } = await supabase
      .from("task_applications")
      .update({ status: "accepted" })
      .eq("id", applicationId);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to accept application",
        variant: "destructive",
      });
      return { success: false };
    }

    // Reject all other pending applications
    await supabase
      .from("task_applications")
      .update({ status: "rejected" })
      .eq("task_id", application.task_id)
      .neq("id", applicationId)
      .eq("status", "pending");

    // Update task status and assign voucher
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        status: "assigned",
        voucher_id: application.voucher_id,
      })
      .eq("id", application.task_id);

    if (taskError) {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
      return { success: false };
    }

    toast({
      title: "Voucher selected!",
      description: `${application.voucher?.full_name || "Voucher"} has been assigned to this task`,
    });

    await fetchApplications();
    return { success: true };
  };

  const rejectApplication = async (applicationId: string) => {
    if (!user) return { success: false };

    const { error } = await supabase
      .from("task_applications")
      .update({ status: "rejected" })
      .eq("id", applicationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
      return { success: false };
    }

    toast({
      title: "Application rejected",
    });

    await fetchApplications();
    return { success: true };
  };

  const pendingApplications = applications.filter((app) => app.status === "pending");
  const acceptedApplication = applications.find((app) => app.status === "accepted");

  return {
    applications,
    pendingApplications,
    acceptedApplication,
    myApplication,
    loading,
    applyToTask,
    withdrawApplication,
    acceptApplication,
    rejectApplication,
    refetch: fetchApplications,
  };
}
