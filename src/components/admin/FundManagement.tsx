import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Check, X, Clock, Loader2, Eye, RefreshCw, User, ArrowUpCircle } from "lucide-react";

interface PendingDeposit {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
  user?: { full_name: string | null };
}

export function FundManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<PendingDeposit | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: deposits, isLoading, refetch } = useQuery({
    queryKey: ["admin-pending-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`*, user:profiles!transactions_user_id_fkey (full_name)`)
        .eq("type", "deposit")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data.map(d => ({
        ...d,
        user: Array.isArray(d.user) ? d.user[0] : d.user,
      })) as PendingDeposit[];
    },
  });

  const pendingDeposits = deposits?.filter(d => d.status === "pending") || [];
  const totalPending = pendingDeposits.reduce((s, d) => s + d.amount, 0);

  const handleApprove = async () => {
    if (!selectedDeposit) return;
    setProcessing(true);
    try {
      // Update transaction status
      await supabase.from("transactions").update({ status: "completed" }).eq("id", selectedDeposit.id);

      // Update user wallet balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", selectedDeposit.user_id)
        .single();

      if (profile) {
        await supabase.from("profiles").update({
          wallet_balance: (profile.wallet_balance || 0) + selectedDeposit.amount,
        }).eq("id", selectedDeposit.user_id);
      }

      toast({ title: "Deposit Approved", description: `₦${selectedDeposit.amount.toLocaleString()} credited to user` });
      setSelectedDeposit(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
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
      await supabase.from("transactions").update({ status: "failed" }).eq("id", selectedDeposit.id);
      toast({ title: "Deposit Rejected" });
      setSelectedDeposit(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "completed": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><X className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeposits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalPending.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deposits?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fund Deposits</CardTitle>
            <CardDescription>Manage user fund additions</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : deposits?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deposit transactions</p>
            </div>
          ) : (
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
                {deposits?.map((dep) => (
                  <TableRow key={dep.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {dep.user?.full_name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">₦{dep.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {dep.description || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(dep.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dep.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {dep.status === "pending" ? (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedDeposit(dep); setAdminNotes(""); }}>
                          <Eye className="h-4 w-4 mr-1" />Review
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Deposit</DialogTitle>
            <DialogDescription>Approve or reject this fund addition</DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="font-medium">{selectedDeposit.user?.full_name || "Unknown"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">₦{selectedDeposit.amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="text-sm">{selectedDeposit.description || "-"}</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea placeholder="Optional notes..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}Reject
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
