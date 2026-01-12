import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

interface WithdrawFundsProps {
  withdrawableBalance: number;
  onWithdrawalComplete?: () => void;
}

export const WithdrawFunds = ({ withdrawableBalance, onWithdrawalComplete }: WithdrawFundsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPayoutHistory();
    }
  }, [user]);

  const fetchPayoutHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPayoutHistory(data || []);
    } catch (error) {
      console.error("Error fetching payout history:", error);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    if (withdrawAmount > withdrawableBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      toast({ title: "Please fill all bank details", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create payout request
      const { error: payoutError } = await supabase
        .from("payout_requests")
        .insert({
          user_id: user!.id,
          amount: withdrawAmount,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          status: "pending"
        });

      if (payoutError) throw payoutError;

      // Update withdrawable balance
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({
          withdrawable_balance: withdrawableBalance - withdrawAmount
        })
        .eq("id", user!.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "withdrawal",
        amount: -withdrawAmount,
        status: "pending",
        description: `Withdrawal request to ${bankName}`
      });

      toast({
        title: "Withdrawal request submitted!",
        description: "Your request is pending admin approval"
      });

      // Reset form
      setAmount("");
      fetchPayoutHistory();
      onWithdrawalComplete?.();

    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-accent text-accent-foreground flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case "completed":
        return <Badge className="bg-category-realestate text-white flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Load saved bank details
  useEffect(() => {
    const savedPayments = localStorage.getItem("payment_methods");
    if (savedPayments) {
      const methods = JSON.parse(savedPayments);
      const defaultMethod = methods.find((m: any) => m.is_default) || methods[0];
      if (defaultMethod) {
        setBankName(defaultMethod.bank_name);
        setAccountNumber(defaultMethod.account_number);
        setAccountName(defaultMethod.account_name);
      }
    }
  }, []);

  return (
    <Card className="rounded-3xl shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-primary" />
          Withdraw Funds
        </CardTitle>
        <CardDescription>Transfer your earnings to your bank account</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available for withdrawal</p>
              <p className="text-3xl font-bold text-foreground">
                ₦{withdrawableBalance.toLocaleString()}
              </p>
            </div>
            <Wallet className="w-10 h-10 text-accent" />
          </div>
        </div>

        {withdrawableBalance <= 0 ? (
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No funds available for withdrawal</p>
            <p className="text-sm text-muted-foreground">Complete tasks to earn withdrawable funds</p>
          </div>
        ) : (
          <>
            {/* Withdrawal Form */}
            <div className="space-y-4">
              <div>
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl mt-1"
                  max={withdrawableBalance}
                />
                <div className="flex gap-2 mt-2">
                  {[1000, 5000, 10000].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => setAmount(Math.min(preset, withdrawableBalance).toString())}
                      disabled={preset > withdrawableBalance}
                    >
                      ₦{preset.toLocaleString()}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setAmount(withdrawableBalance.toString())}
                  >
                    Max
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Bank Details</span>
                </div>

                <div>
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="e.g. Access Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="rounded-xl mt-1"
                  />
                </div>

                <div>
                  <Label>Account Number</Label>
                  <Input
                    placeholder="10-digit account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    maxLength={10}
                    className="rounded-xl mt-1"
                  />
                </div>

                <div>
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Name on account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={handleWithdraw}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full gradient-primary text-primary-foreground rounded-xl shadow-button"
              >
                {loading ? "Processing..." : "Request Withdrawal"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Withdrawals are processed within 24-48 hours after admin approval
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* Payout History */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="font-medium">Payout History</span>
            <span className="text-muted-foreground">{payoutHistory.length} requests</span>
          </Button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {payoutHistory.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No withdrawal history
                </p>
              ) : (
                payoutHistory.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">₦{payout.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {payout.bank_name} • ****{payout.account_number?.slice(-4)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    {getStatusBadge(payout.status)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
