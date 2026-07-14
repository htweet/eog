import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Banknote, Check, X, Clock, Loader2, Eye, RefreshCw, User, ArrowUpCircle,
  Search, Filter, RotateCcw, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";

interface DepositTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
  user?: { full_name: string | null };
}

type StatusFilter = "all" | "pending" | "completed" | "failed" | "refunded";

export function FundManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<DepositTransaction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: deposits, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`*, user:profiles!transactions_user_id_fkey (full_name)`)
        .eq("type", "deposit")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data.map(d => ({
        ...d,
        user: Array.isArray(d.user) ? d.user[0] : d.user,
      })) as DepositTransaction[];
    },
  });

  const filteredDeposits = deposits?.filter(d => {
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesSearch = !searchQuery || 
      d.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const pendingCount = deposits?.filter(d => d.status === "pending").length || 0;
  const completedCount = deposits?.filter(d => d.status === "completed").length || 0;
  const failedCount = deposits?.filter(d => d.status === "failed").length || 0;
  const totalPending = deposits?.filter(d => d.status === "pending").reduce((s, d) => s + d.amount, 0) || 0;
  const totalProcessed = deposits?.filter(d => d.status === "completed").reduce((s, d) => s + d.amount, 0) || 0;

  const handleApprove = async () => {
    if (!selectedDeposit) return;
    setProcessing(true);
    try {
      await supabase.from("transactions").update({ 
        status: "completed",
        description: selectedDeposit.description 
          ? `${selectedDeposit.description} | Admin: ${adminNotes || 'Approved'}`
          : `Admin approved: ${adminNotes || 'Deposit approved'}`
      }).eq("id", selectedDeposit.id);

      // Credit user wallet atomically via SECURITY DEFINER RPC (financial columns not client-writable)
      await supabase.rpc("admin_credit_wallet", {
        p_user_id: selectedDeposit.user_id,
        p_amount: selectedDeposit.amount,
      } as any);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: selectedDeposit.user_id,
        type: "deposit_approved",
        title: "Deposit Approved ✅",
        message: `Your deposit of ₦${selectedDeposit.amount.toLocaleString()} has been approved and credited to your wallet.`,
      });

      toast({ title: "Deposit Approved", description: `₦${selectedDeposit.amount.toLocaleString()} credited to user` });
      setSelectedDeposit(null);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-all-deposits"] });
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit) return;
    setProcessing(true);
    try {
      await supabase.from("transactions").update({ 
        status: "failed",
        description: selectedDeposit.description 
          ? `${selectedDeposit.description} | Rejected: ${adminNotes || 'Did not pass review'}`
          : `Rejected: ${adminNotes || 'Did not pass review'}`
      }).eq("id", selectedDeposit.id);

      await supabase.from("notifications").insert({
        user_id: selectedDeposit.user_id,
        type: "deposit_rejected",
        title: "Deposit Rejected",
        message: `Your deposit of ₦${selectedDeposit.amount.toLocaleString()} was not approved. ${adminNotes || 'Contact support for details.'}`,
      });

      toast({ title: "Deposit Rejected" });
      setSelectedDeposit(null);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-all-deposits"] });
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefund = async (deposit: DepositTransaction) => {
    setProcessing(true);
    try {
      await supabase.from("transactions").update({ status: "refunded" as any }).eq("id", deposit.id);
      
      // If it was completed, deduct from wallet
      if (deposit.status === "completed") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", deposit.user_id)
          .single();

        if (profile) {
          await supabase.from("profiles").update({
            wallet_balance: Math.max(0, (profile.wallet_balance || 0) - deposit.amount),
          }).eq("id", deposit.user_id);
        }
      }

      await supabase.from("notifications").insert({
        user_id: deposit.user_id,
        type: "deposit_refunded",
        title: "Deposit Refunded",
        message: `Your deposit of ₦${deposit.amount.toLocaleString()} has been refunded.`,
      });

      toast({ title: "Deposit Refunded" });
      queryClient.invalidateQueries({ queryKey: ["admin-all-deposits"] });
    } catch {
      toast({ title: "Error", description: "Failed to refund", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "completed": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "refunded": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><RotateCcw className="h-3 w-3 mr-1" />Refunded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={pendingCount > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">₦{totalPending.toLocaleString()} waiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedCount}</div>
            <p className="text-xs text-muted-foreground">₦{totalProcessed.toLocaleString()} credited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deposits?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              All Fund Deposits
            </CardTitle>
            <CardDescription>Complete deposit history with management tools</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending" className="gap-1">
                  Pending {pendingCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="completed">Approved</TabsTrigger>
                <TabsTrigger value="failed">Rejected</TabsTrigger>
                <TabsTrigger value="refunded">Refunded</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deposits found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.map((dep) => (
                    <TableRow key={dep.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{dep.user?.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">₦{dep.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {dep.description || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(dep.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(dep.created_at).toLocaleDateString()} {new Date(dep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {dep.status === "pending" && (
                            <Button variant="outline" size="sm" onClick={() => { setSelectedDeposit(dep); setAdminNotes(""); }}>
                              <Eye className="h-4 w-4 mr-1" />Review
                            </Button>
                          )}
                          {dep.status === "completed" && (
                            <Button variant="ghost" size="sm" className="text-blue-500" onClick={() => handleRefund(dep)} disabled={processing}>
                              <RotateCcw className="h-4 w-4 mr-1" />Refund
                            </Button>
                          )}
                          {(dep.status === "failed" || dep.status === "refunded") && (
                            <span className="text-xs text-muted-foreground italic">Processed</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Review Deposit
            </DialogTitle>
            <DialogDescription>Approve or reject this fund addition request</DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="font-medium">{selectedDeposit.user?.full_name || "Unknown"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-lg text-primary">₦{selectedDeposit.amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="text-sm">{selectedDeposit.description || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-sm">{new Date(selectedDeposit.created_at).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span className="text-xs font-mono">{selectedDeposit.id.slice(0, 8)}...</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea placeholder="Add notes about this decision..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}Reject
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}Approve & Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
