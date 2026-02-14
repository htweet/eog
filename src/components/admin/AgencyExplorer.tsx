import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, Users, ChevronDown, ChevronRight, Loader2, RefreshCw, Ban,
  UserX, Wallet, Crown, Search, Shield, CheckCircle, FileText, Eye,
  UserPlus, Mail, AlertTriangle, Clock,
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
  is_verified: boolean | null;
  company_details: {
    company_name?: string;
    registration_number?: string;
    staff_count?: number;
  } | null;
  wallet_balance: number;
  withdrawable_balance: number;
  team_members: TeamMember[];
  tasks_completed?: number;
  kyc_status?: string;
}

interface KYCRequest {
  id: string;
  user_id: string;
  company_name: string;
  registration_number: string;
  status: string;
  kyc_status: string | null;
  kyc_id_type: string | null;
  kyc_id_number: string | null;
  kyc_address: string | null;
  kyc_notes: string | null;
  document_urls: string[];
  created_at: string;
  user?: { full_name: string | null };
}

export function AgencyExplorer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [freezeTarget, setFreezeTarget] = useState<ProAgency | null>(null);
  const [removeStaffTarget, setRemoveStaffTarget] = useState<{ agency: ProAgency; staff: TeamMember } | null>(null);
  const [kycReviewTarget, setKycReviewTarget] = useState<KYCRequest | null>(null);
  const [kycNotes, setKycNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"agencies" | "kyc">("agencies");

  const { data: agencies, isLoading, refetch } = useQuery({
    queryKey: ["admin-agencies-enhanced"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, voucher_tier, company_details, wallet_balance, withdrawable_balance, is_verified")
        .in("voucher_tier", ["pro", "pending_pro"])
        .order("full_name");

      if (error) throw error;

      const agenciesWithStaff = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: members } = await supabase
            .from("team_members")
            .select("id, staff_name, staff_email, status")
            .eq("parent_company_id", profile.id);

          const { count: tasksCompleted } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("voucher_id", profile.id)
            .eq("status", "completed");

          return {
            ...profile,
            team_members: (members || []) as TeamMember[],
            tasks_completed: tasksCompleted || 0,
          } as ProAgency;
        })
      );

      return agenciesWithStaff;
    },
  });

  const { data: kycRequests } = useQuery({
    queryKey: ["admin-kyc-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_upgrade_requests")
        .select(`*, user:profiles!pro_upgrade_requests_user_id_fkey (full_name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(r => ({
        ...r,
        user: Array.isArray(r.user) ? r.user[0] : r.user,
        document_urls: Array.isArray(r.document_urls) ? r.document_urls as string[] : [],
      })) as KYCRequest[];
    },
  });

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedAgencies);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpandedAgencies(newSet);
  };

  const filteredAgencies = agencies?.filter(a =>
    !searchQuery ||
    a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.company_details?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFreezeAgency = async () => {
    if (!freezeTarget) return;
    setProcessing(true);
    try {
      await supabase.from("team_members").update({ status: "inactive" } as any).eq("parent_company_id", freezeTarget.id);
      await supabase.from("profiles").update({ voucher_tier: "standard" } as any).eq("id", freezeTarget.id);
      await supabase.from("notifications").insert({
        user_id: freezeTarget.id, type: "account_frozen",
        title: "Account Operations Paused",
        message: "Your Pro account has been suspended. Please contact support.",
      });
      toast({ title: "Agency Frozen", description: `${freezeTarget.company_details?.company_name || "Agency"} suspended` });
      setFreezeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-agencies-enhanced"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleRemoveStaff = async () => {
    if (!removeStaffTarget) return;
    setProcessing(true);
    try {
      await supabase.from("team_members").delete().eq("id", removeStaffTarget.staff.id);
      toast({ title: "Staff Removed", description: `${removeStaffTarget.staff.staff_name} removed` });
      setRemoveStaffTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-agencies-enhanced"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleKYCApprove = async () => {
    if (!kycReviewTarget) return;
    setProcessing(true);
    try {
      await supabase.from("pro_upgrade_requests").update({
        status: "approved",
        kyc_status: "verified",
        kyc_notes: kycNotes || "KYC verified by admin",
        kyc_verified_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", kycReviewTarget.id);

      await supabase.from("profiles").update({
        voucher_tier: "pro",
        is_verified: true,
        company_details: {
          company_name: kycReviewTarget.company_name,
          registration_number: kycReviewTarget.registration_number,
          staff_count: 0,
        }
      } as any).eq("id", kycReviewTarget.user_id);

      await supabase.from("notifications").insert({
        user_id: kycReviewTarget.user_id, type: "kyc_approved",
        title: "KYC Verified! 🎉",
        message: `Your ${kycReviewTarget.company_name} business has been verified. You now have a verified badge!`,
      });

      toast({ title: "KYC Approved", description: `${kycReviewTarget.company_name} is now verified` });
      setKycReviewTarget(null);
      setKycNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-requests", "admin-agencies-enhanced"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleKYCReject = async () => {
    if (!kycReviewTarget) return;
    setProcessing(true);
    try {
      await supabase.from("pro_upgrade_requests").update({
        status: "rejected",
        kyc_status: "rejected",
        kyc_notes: kycNotes || "KYC did not pass verification",
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", kycReviewTarget.id);

      await supabase.from("profiles").update({ voucher_tier: "standard" } as any).eq("id", kycReviewTarget.user_id);

      await supabase.from("notifications").insert({
        user_id: kycReviewTarget.user_id, type: "kyc_rejected",
        title: "KYC Verification Update",
        message: kycNotes || "Your KYC verification was not approved. Please resubmit with correct documents.",
      });

      toast({ title: "KYC Rejected" });
      setKycReviewTarget(null);
      setKycNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-requests"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const getKycStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default: return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getStaffStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'inactive': return <Badge className="bg-muted text-muted-foreground">Inactive</Badge>;
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingKYC = kycRequests?.filter(r => r.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencies?.filter(a => a.voucher_tier === "pro").length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencies?.reduce((sum, a) => sum + a.team_members.length, 0) || 0}</div>
          </CardContent>
        </Card>
        <Card className={pendingKYC > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <Shield className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingKYC}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aggregated Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{agencies?.reduce((sum, a) => sum + (a.withdrawable_balance || 0), 0).toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="agencies" className="gap-2"><Building2 className="h-4 w-4" />Agencies</TabsTrigger>
            <TabsTrigger value="kyc" className="gap-2">
              <Shield className="h-4 w-4" />KYC Verification
              {pendingKYC > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">{pendingKYC}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search agencies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {viewMode === "agencies" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Agency & Staff Explorer</CardTitle>
            <CardDescription>View and manage Pro agencies, staff, and KYC status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filteredAgencies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No Pro agencies found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredAgencies.map((agency) => (
                    <Collapsible key={agency.id} open={expandedAgencies.has(agency.id)} onOpenChange={() => toggleExpanded(agency.id)}>
                      <div className="border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              {expandedAgencies.has(agency.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <Building2 className="h-5 w-5 text-amber-500" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{agency.company_details?.company_name || agency.full_name || "Unknown"}</span>
                                  <ProBadge tier={agency.voucher_tier} size="sm" />
                                  {agency.is_verified && (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                                      <CheckCircle className="h-3 w-3 mr-0.5" />KYC
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{agency.team_members.length} staff · {agency.tasks_completed} tasks completed</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium">₦{(agency.withdrawable_balance || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Withdrawable</p>
                              </div>
                              <Button variant="outline" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setFreezeTarget(agency); }}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t px-4 py-3 bg-muted/30">
                            {agency.team_members.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">No team members</p>
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
                                      <TableCell>{getStaffStatusBadge(staff.status)}</TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRemoveStaffTarget({ agency, staff })}>
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
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        /* KYC View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-amber-500" />KYC Verification Queue</CardTitle>
            <CardDescription>Review agency KYC documents and verify identities</CardDescription>
          </CardHeader>
          <CardContent>
            {!kycRequests || kycRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No KYC requests</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>RC Number</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.user?.full_name || "Unknown"}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-amber-500" />{req.company_name}</div></TableCell>
                        <TableCell className="font-mono text-sm">{req.registration_number}</TableCell>
                        <TableCell>{getKycStatusBadge(req.kyc_status || (req.status === "pending" ? "pending" : req.status))}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "outline"} className="text-xs">
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => { setKycReviewTarget(req); setKycNotes(""); }}>
                            <Eye className="h-4 w-4 mr-1" />Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Freeze Agency Dialog */}
      <AlertDialog open={!!freezeTarget} onOpenChange={() => setFreezeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freeze Agency Operations</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate all staff and downgrade to standard. Are you sure you want to freeze {freezeTarget?.company_details?.company_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFreezeAgency} className="bg-destructive text-destructive-foreground" disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Freeze Agency
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Staff Dialog */}
      <AlertDialog open={!!removeStaffTarget} onOpenChange={() => setRemoveStaffTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>Remove {removeStaffTarget?.staff.staff_name} from {removeStaffTarget?.agency.company_details?.company_name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveStaff} className="bg-destructive text-destructive-foreground" disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Remove Staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* KYC Review Dialog */}
      <Dialog open={!!kycReviewTarget} onOpenChange={() => setKycReviewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-amber-500" />KYC Verification Review</DialogTitle>
            <DialogDescription>Review documents and verify agency identity</DialogDescription>
          </DialogHeader>
          {kycReviewTarget && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Applicant</span><span className="font-medium">{kycReviewTarget.user?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span className="font-medium">{kycReviewTarget.company_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">RC Number</span><span className="font-mono">{kycReviewTarget.registration_number}</span></div>
                {kycReviewTarget.kyc_id_type && <div className="flex justify-between"><span className="text-muted-foreground">ID Type</span><span>{kycReviewTarget.kyc_id_type}</span></div>}
                {kycReviewTarget.kyc_id_number && <div className="flex justify-between"><span className="text-muted-foreground">ID Number</span><span className="font-mono">{kycReviewTarget.kyc_id_number}</span></div>}
                {kycReviewTarget.kyc_address && <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-sm">{kycReviewTarget.kyc_address}</span></div>}
              </div>

              {kycReviewTarget.document_urls.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uploaded Documents</label>
                  <div className="flex flex-wrap gap-2">
                    {kycReviewTarget.document_urls.map((url, i) => (
                      <Button key={i} variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4 mr-1" />Document {i + 1}</a>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin KYC Notes</label>
                <Textarea placeholder="Add verification notes..." value={kycNotes} onChange={(e) => setKycNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={handleKYCReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}Reject KYC
            </Button>
            <Button onClick={handleKYCApprove} disabled={processing} className="bg-gradient-to-r from-amber-500 to-amber-600">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}Verify & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
