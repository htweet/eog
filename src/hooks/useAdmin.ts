import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  created_at: string;
  requester_id: string;
  voucher_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
  trust_score: number | null;
  is_verified: boolean | null;
  wallet_balance: number | null;
  created_at: string | null;
}

interface UserWithRole extends Profile {
  role: string | null;
  avatar_url: string | null;
}

interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalTransactions: number;
  pendingDisputes: number;
  totalBountyPaid: number;
  activeTasksCount: number;
}

interface AppSettings {
  platformFeePercent: number;
  minBountyAmount: number;
  maxBountyAmount: number;
  autoApproveVerified: boolean;
  requireGpsVerification: boolean;
  escrowEnabled: boolean;
}

export function useAdmin() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTasks: 0,
    totalTransactions: 0,
    pendingDisputes: 0,
    totalBountyPaid: 0,
    activeTasksCount: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [disputes, setDisputes] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    platformFeePercent: 5,
    minBountyAmount: 5,
    maxBountyAmount: 1000,
    autoApproveVerified: false,
    requireGpsVerification: true,
    escrowEnabled: true,
  });

  // Now isAdmin comes from useAuth which checks if user has admin role in allRoles

  useEffect(() => {
    if (user && isAdmin) {
      fetchAdminData();
    }
  }, [user, isAdmin]);

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      // Fetch all tasks
      const { data: tasksData, count: tasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100);

      setTasks(tasksData || []);

      // Fetch disputed tasks
      const { data: disputedTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "disputed")
        .order("created_at", { ascending: false });

      setDisputes(disputedTasks || []);

      // Fetch all profiles with roles
      const { data: profilesData, count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Fetch roles for each user
      if (profilesData) {
        const usersWithRoles: UserWithRole[] = await Promise.all(
          profilesData.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .maybeSingle();
            return {
              ...profile,
              role: roleData?.role || null,
            };
          })
        );
        setUsers(usersWithRoles);
      }

      // Fetch transaction stats
      const { data: transactionsData, count: transactionsCount } = await supabase
        .from("transactions")
        .select("amount, type", { count: "exact" })
        .eq("status", "completed");

      const totalBountyPaid = transactionsData
        ?.filter((t) => t.type === "bounty_paid")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Count active tasks
      const activeTasks = tasksData?.filter((t) =>
        ["open", "in_progress", "pending_review"].includes(t.status)
      ).length || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalTasks: tasksCount || 0,
        totalTransactions: transactionsCount || 0,
        pendingDisputes: disputedTasks?.length || 0,
        totalBountyPaid,
        activeTasksCount: activeTasks,
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserVerification = async (userId: string, isVerified: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: isVerified })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${isVerified ? "verified" : "unverified"} successfully`,
      });

      await fetchAdminData();
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const updateUserTrustScore = async (userId: string, trustScore: number) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ trust_score: trustScore })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trust score updated successfully",
      });

      await fetchAdminData();
    } catch (error) {
      console.error("Error updating trust score:", error);
      toast({
        title: "Error",
        description: "Failed to update trust score",
        variant: "destructive",
      });
    }
  };

  const resolveDispute = async (taskId: string, resolution: 'approve' | 'reject') => {
    try {
      const task = disputes.find((d) => d.id === taskId);
      if (!task) return;

      if (resolution === 'approve') {
        // Approve: release escrow atomically via RPC (voucher gets paid)
        const { error } = await supabase.rpc('release_escrow', {
          p_task_id: taskId,
        } as any);
        if (error) throw error;

        await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
      } else {
        // Reject: refund escrow atomically via RPC (requester gets refund)
        const { error } = await supabase.rpc('refund_escrow', {
          p_task_id: taskId,
          p_reason: 'Dispute resolved - refunded to requester',
        } as any);
        if (error) throw error;

        await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
      }

      toast({
        title: "Dispute Resolved",
        description: `Task has been ${resolution === 'approve' ? 'approved' : 'rejected'}`,
      });

      await fetchAdminData();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast({
        title: "Error",
        description: "Failed to resolve dispute",
        variant: "destructive",
      });
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    toast({
      title: "Settings Updated",
      description: "Platform settings have been updated",
    });
  };

  return {
    isAdmin,
    loading,
    stats,
    tasks,
    users,
    disputes,
    settings,
    fetchAdminData,
    updateUserVerification,
    updateUserTrustScore,
    resolveDispute,
    updateSettings,
  };
}
