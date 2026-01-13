import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Banknote,
  ArrowDownToLine,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Building,
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
  processed_at: string | null;
  admin_notes: string | null;
}

export function WithdrawalCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  // Fetch withdrawable balance
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("withdrawable_balance")
        .eq("id", user?.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch payout requests
  const { data: payoutRequests, isLoading } = useQuery({
    queryKey: ["payout-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as PayoutRequest[];
    },
    enabled: !!user,
  });

  const withdrawableBalance = profile?.withdrawable_balance || 0;
  const pendingAmount = payoutRequests
    ?.filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0) || 0;

  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);
    
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    if (amount > withdrawableBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    if (!formData.bankName || !formData.accountNumber || !formData.accountName) {
      toast({ title: "Please fill all bank details", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("payout_requests").insert({
        user_id: user?.id,
        amount: amount,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        account_name: formData.accountName,
        status: "pending",
      });

      if (error) throw error;

      // Update withdrawable balance
      await supabase
        .from("profiles")
        .update({ withdrawable_balance: withdrawableBalance - amount })
        .eq("id", user?.id);

      toast({
        title: "Withdrawal Requested",
        description: "Your request has been submitted for admin approval",
      });

      setIsOpen(false);
      setFormData({ amount: "", bankName: "", accountNumber: "", accountName: "" });
      queryClient.invalidateQueries({ queryKey: ["payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Request Failed",
        description: "Could not process withdrawal request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <CardTitle>Withdraw Funds</CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button disabled={withdrawableBalance <= 0}>
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>
                  Enter your bank details to withdraw funds. Requests are processed within 24-48 hours.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-primary">₦{withdrawableBalance.toLocaleString()}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="e.g., First Bank, GTBank"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="10-digit account number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Account holder name"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Request withdrawal of your earnings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">Withdrawable</p>
            <p className="text-2xl font-bold text-primary">₦{withdrawableBalance.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-foreground">₦{pendingAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Recent Requests</h4>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payoutRequests?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No withdrawal requests yet
            </p>
          ) : (
            <div className="space-y-2">
              {payoutRequests?.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">₦{request.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.bank_name} • {request.account_number?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
