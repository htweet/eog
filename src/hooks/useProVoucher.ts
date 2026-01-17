import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  parent_company_id: string;
  staff_name: string;
  staff_email: string;
  status: 'active' | 'inactive' | 'pending';
  user_id: string | null;
  created_at: string;
}

interface ProProfile {
  voucher_tier: 'standard' | 'pro' | 'pending_pro';
  company_details: {
    registration_number?: string;
    company_name?: string;
    staff_count?: number;
  } | null;
}

interface UpgradeRequest {
  id: string;
  user_id: string;
  company_name: string;
  registration_number: string;
  document_urls: string[];
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

export function useProVoucher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proProfile, setProProfile] = useState<ProProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [upgradeRequest, setUpgradeRequest] = useState<UpgradeRequest | null>(null);

  useEffect(() => {
    if (user) {
      fetchProProfile();
      fetchTeamMembers();
      fetchUpgradeRequest();
    }
  }, [user]);

  const fetchProProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("voucher_tier, company_details")
      .eq("id", user.id)
      .single();

    if (data) {
      setProProfile(data as unknown as ProProfile);
    }
    setLoading(false);
  };

  const fetchTeamMembers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("parent_company_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setTeamMembers(data as unknown as TeamMember[]);
    }
  };

  const fetchUpgradeRequest = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("pro_upgrade_requests")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setUpgradeRequest(data as unknown as UpgradeRequest);
    }
  };

  const requestProUpgrade = async (
    companyName: string,
    registrationNumber: string,
    documentUrls: string[] = []
  ) => {
    if (!user) return { success: false, error: "Not authenticated" };

    setLoading(true);

    try {
      // Create upgrade request
      const { error } = await supabase
        .from("pro_upgrade_requests")
        .insert({
          user_id: user.id,
          company_name: companyName,
          registration_number: registrationNumber,
          document_urls: documentUrls,
          status: "pending",
        } as any);

      if (error) throw error;

      // Update profile to pending_pro
      await supabase
        .from("profiles")
        .update({ 
          voucher_tier: "pending_pro",
          company_details: { company_name: companyName, registration_number: registrationNumber }
        } as any)
        .eq("id", user.id);

      toast({
        title: "Upgrade Request Submitted",
        description: "Your Pro upgrade request is under review. We'll notify you once approved.",
      });

      await fetchUpgradeRequest();
      await fetchProProfile();
      
      return { success: true };
    } catch (error: any) {
      console.error("Error requesting upgrade:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit upgrade request",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (
    staffName: string,
    staffEmail: string,
    staffPinCode: string
  ) => {
    if (!user) return { success: false, error: "Not authenticated" };

    if (proProfile?.voucher_tier !== "pro") {
      toast({
        title: "Pro Account Required",
        description: "You need a Pro account to add team members",
        variant: "destructive",
      });
      return { success: false, error: "Pro account required" };
    }

    try {
      const { error } = await supabase
        .from("team_members")
        .insert({
          parent_company_id: user.id,
          staff_name: staffName,
          staff_email: staffEmail,
          staff_pin_code: staffPinCode,
          status: "pending",
        } as any);

      if (error) throw error;

      toast({
        title: "Team Member Added",
        description: `${staffName} has been added to your team`,
      });

      await fetchTeamMembers();
      
      // Update staff count in company details
      const currentDetails = proProfile?.company_details || {};
      await supabase
        .from("profiles")
        .update({
          company_details: {
            ...currentDetails,
            staff_count: (currentDetails.staff_count || 0) + 1,
          }
        } as any)
        .eq("id", user.id);

      return { success: true };
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const updateTeamMemberStatus = async (memberId: string, status: 'active' | 'inactive') => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from("team_members")
        .update({ status } as any)
        .eq("id", memberId)
        .eq("parent_company_id", user.id);

      if (error) throw error;

      await fetchTeamMembers();
      return { success: true };
    } catch (error) {
      console.error("Error updating team member:", error);
      return { success: false };
    }
  };

  const removeTeamMember = async (memberId: string) => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId)
        .eq("parent_company_id", user.id);

      if (error) throw error;

      toast({
        title: "Team Member Removed",
        description: "The team member has been removed from your team",
      });

      await fetchTeamMembers();
      return { success: true };
    } catch (error) {
      console.error("Error removing team member:", error);
      return { success: false };
    }
  };

  const assignTaskToStaff = async (taskId: string, staffId: string) => {
    if (!user || proProfile?.voucher_tier !== "pro") {
      return { success: false, error: "Pro account required" };
    }

    try {
      // Update the verification record with staff assignment
      const { error } = await supabase
        .from("verifications")
        .update({ assigned_staff_id: staffId } as any)
        .eq("task_id", taskId);

      if (error) throw error;

      toast({
        title: "Task Assigned",
        description: "The task has been assigned to the selected staff member",
      });

      return { success: true };
    } catch (error) {
      console.error("Error assigning task:", error);
      return { success: false };
    }
  };

  const isPro = proProfile?.voucher_tier === "pro";
  const isPendingPro = proProfile?.voucher_tier === "pending_pro";

  return {
    loading,
    proProfile,
    teamMembers,
    upgradeRequest,
    isPro,
    isPendingPro,
    requestProUpgrade,
    addTeamMember,
    updateTeamMemberStatus,
    removeTeamMember,
    assignTaskToStaff,
    refetch: () => {
      fetchProProfile();
      fetchTeamMembers();
      fetchUpgradeRequest();
    },
  };
}
