import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Ban,
  UserX,
  Wallet,
  Crown,
} from "lucide-react";
import { ProBadge } from "@/components/pro/ProBadge";

interface TeamMember {
  id: string;
  staff_name: string;
  staff_email: string;
  status: 'active' | 'inactive' | 'pending';
}

interface ProAgency {
  id: string;
  full_name: string | null;
  voucher_tier: 'standard' | 'pro' | 'pending_pro';
  company_details: {
    company_name?: string;
    registration_number?: string;
    staff_count?: number;
  } | null;
  wallet_balance: number;
  withdrawable_balance: number;
  team_members: TeamMember[];
}

export function AgencyExplorer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [freezeTarget, setFreezeTarget] = useState<ProAgency | null>(null);
  const [removeStaffTarget, setRemoveStaffTarget] = useState<{ agency: ProAgency; staff: TeamMember } | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data: agencies, isLoading, refetch } = useQuery({
    queryKey: ["admin-agencies"],
    queryFn: async () => {
      // Get all Pro vouchers
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, voucher_tier, company_details, wallet_balance, withdrawable_balance")
        .in("voucher_tier", ["pro", "pending_pro"])
        .order("full_name");

      if (error) throw error;

      // Get team members for each agency
      const agenciesWithStaff = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: members } = await supabase
            .from("team_members")
            .select("id, staff_name, staff_email, status")
            .eq("parent_company_id", profile.id);

          return {
            ...profile,
            team_members: (members || []) as TeamMember[],
          } as ProAgency;
        })
      );

      return agenciesWithStaff;
    },
  });

  const toggleExpanded = (agencyId: string) => {
    const newExpanded = new Set(expandedAgencies);
    if (newExpanded.has(agencyId)) {
      newExpanded.delete(agencyId);
    } else {
      newExpanded.add(agencyId);
    }
    setExpandedAgencies(newExpanded);
  };

  const handleFreezeAgency = async () => {
    if (!freezeTarget) return;
    setProcessing(true);

    try {
      // Deactivate all team members
      await supabase
        .from("team_members")
        .update({ status: "inactive" } as any)
        .eq("parent_company_id", freezeTarget.id);

      // Downgrade to standard tier
      await supabase
        .from("profiles")
        .update({ voucher_tier: "standard" } as any)
        .eq("id", freezeTarget.id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: freezeTarget.id,
        type: "account_frozen",
        title: "Account Operations Paused",
        message: "Your Pro account has been suspended. Please contact support for more information.",
      });

      toast({
        title: "Agency Frozen",
        description: `${freezeTarget.company_details?.company_name || "Agency"} operations have been suspended`,
      });

      setFreezeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-agencies"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to freeze agency",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveStaff = async () => {
    if (!removeStaffTarget) return;
    setProcessing(true);

    try {
      await supabase
        .from("team_members")
        .delete()
        .eq("id", removeStaffTarget.staff.id);

      toast({
        title: "Staff Removed",
        description: `${removeStaffTarget.staff.staff_name} has been removed from the agency`,
      });

      setRemoveStaffTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-agencies"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove staff member",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agencies?.filter(a => a.voucher_tier === "pro").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agencies?.reduce((sum, a) => sum + a.team_members.length, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aggregated Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{agencies?.reduce((sum, a) => sum + (a.withdrawable_balance || 0), 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agency List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Agency & Staff Explorer
            </CardTitle>
            <CardDescription>View and manage Pro agencies and their team members</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agencies?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No Pro agencies found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agencies?.map((agency) => (
                <Collapsible
                  key={agency.id}
                  open={expandedAgencies.has(agency.id)}
                  onOpenChange={() => toggleExpanded(agency.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {expandedAgencies.has(agency.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Building2 className="h-5 w-5 text-amber-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {agency.company_details?.company_name || agency.full_name || "Unknown"}
                              </span>
                              <ProBadge tier={agency.voucher_tier} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {agency.team_members.length} staff members
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">₦{(agency.withdrawable_balance || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Withdrawable</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFreezeTarget(agency);
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 py-3 bg-muted/30">
                        {agency.team_members.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No team members
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Staff Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {agency.team_members.map((staff) => (
                                <TableRow key={staff.id}>
                                  <TableCell className="font-medium">{staff.staff_name}</TableCell>
                                  <TableCell className="text-muted-foreground">{staff.staff_email}</TableCell>
                                  <TableCell>{getStatusBadge(staff.status)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => setRemoveStaffTarget({ agency, staff })}
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freeze Agency Dialog */}
      <AlertDialog open={!!freezeTarget} onOpenChange={() => setFreezeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freeze Agency Operations</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate all staff members and downgrade the agency to a standard account.
              Are you sure you want to freeze {freezeTarget?.company_details?.company_name || "this agency"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFreezeAgency}
              className="bg-destructive text-destructive-foreground"
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Freeze Agency
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Staff Dialog */}
      <AlertDialog open={!!removeStaffTarget} onOpenChange={() => setRemoveStaffTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeStaffTarget?.staff.staff_name} from{" "}
              {removeStaffTarget?.agency.company_details?.company_name || "the agency"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStaff}
              className="bg-destructive text-destructive-foreground"
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
