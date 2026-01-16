import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimePayouts } from "@/hooks/useRealtimePayouts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  Check,
  X,
  Clock,
  Building,
  User,
  Loader2,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string | null;
  user_id: string;
  admin_notes: string | null;
  user?: {
    full_name: string | null;
  };
}

export function PayoutManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Enable realtime updates
  useRealtimePayouts();

  const { data: payoutRequests, isLoading, refetch } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          *,
          user:profiles!payout_requests_user_id_fkey (full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data
      return data.map(req => ({
        ...req,
        user: Array.isArray(req.user) ? req.user[0] : req.user
      })) as PayoutRequest[];
    },
  });
  const pendingRequests = payoutRequests?.filter((r) => r.status === "pending") || [];
  const totalPending = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("payout_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes || "Approved for payout",
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: selectedRequest.user_id,
        type: "withdrawal",
        amount: -selectedRequest.amount,
        status: "completed",
        description: `Withdrawal to ${selectedRequest.bank_name} - ${selectedRequest.account_number}`,
      });

      toast({
        title: "Payout Approved",
        description: `₦${selectedRequest.amount.toLocaleString()} approved for ${selectedRequest.account_name}`,
      });

      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payout",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      // Restore balance - get current and add back
      const { data: profile } = await supabase
        .from("profiles")
        .select("withdrawable_balance")
        .eq("id", selectedRequest.user_id)
        .single();
      
      const currentBalance = profile?.withdrawable_balance || 0;
      await supabase
        .from("profiles")
        .update({ withdrawable_balance: currentBalance + selectedRequest.amount })
        .eq("id", selectedRequest.user_id);

      const { error } = await supabase
        .from("payout_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes || "Rejected by admin",
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Payout Rejected",
        description: "The withdrawal request has been rejected and balance restored",
      });

      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject payout",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
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
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Amount</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalPending.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payoutRequests?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payout Requests</CardTitle>
            <CardDescription>Review and process withdrawal requests</CardDescription>
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
          ) : payoutRequests?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payout requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutRequests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {request.user?.full_name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ₦{request.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{request.bank_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.account_number} - {request.account_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.created_at
                        ? new Date(request.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes("");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Payout Request</DialogTitle>
            <DialogDescription>
              Approve or reject this withdrawal request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{selectedRequest.user?.full_name || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">₦{selectedRequest.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span>{selectedRequest.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span>{selectedRequest.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name</span>
                  <span>{selectedRequest.account_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  placeholder="Add notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || selectedRequest?.status !== "pending"}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing || selectedRequest?.status !== "pending"}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
