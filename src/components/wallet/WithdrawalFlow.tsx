import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Banknote, Loader2, CheckCircle, AlertCircle, Building2 } from "lucide-react";

interface WithdrawalFlowProps {
  withdrawableBalance: number;
  onSuccess?: () => void;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Keystone Bank",
  "Polaris Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
  "Opay",
  "Kuda Bank",
  "Palmpay",
  "Moniepoint",
];

export function WithdrawalFlow({ withdrawableBalance, onSuccess }: WithdrawalFlowProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"details" | "confirm" | "success">("details");
  const [loading, setLoading] = useState(false);
  const [savedBankDetails, setSavedBankDetails] = useState<BankDetails | null>(null);
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    if (user) {
      fetchSavedBankDetails();
    }
  }, [user]);

  const fetchSavedBankDetails = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("withdrawal_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const details = {
        bankName: data.bank_name || "",
        accountNumber: data.account_number || "",
        accountName: data.account_name || "",
      };
      setSavedBankDetails(details);
      setBankDetails(details);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (withdrawAmount > withdrawableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      toast.error("Please fill in all bank details");
      return;
    }

    setLoading(true);

    try {
      // Use secure RPC for withdrawal
      const { data, error } = await supabase.rpc("request_withdrawal_secure", {
        p_amount: withdrawAmount,
        p_bank_name: bankDetails.bankName,
        p_account_number: bankDetails.accountNumber,
        p_account_name: bankDetails.accountName,
      });

      const result = data as { success?: boolean; error?: string } | null;

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || "Withdrawal failed");
      }

      // Save bank details for future use
      await supabase
        .from("withdrawal_settings")
        .upsert({
          user_id: user.id,
          bank_name: bankDetails.bankName,
          account_number: bankDetails.accountNumber,
          account_name: bankDetails.accountName,
        });

      setStep("success");
      onSuccess?.();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep("details");
    setAmount("");
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) resetDialog();
      setDialogOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button className="w-full" disabled={withdrawableBalance <= 0}>
          <Banknote className="mr-2 h-4 w-4" />
          Withdraw Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Available balance: ₦{withdrawableBalance.toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={withdrawableBalance}
                />
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setAmount(withdrawableBalance.toString())}
                >
                  Withdraw all
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Select
                  value={bankDetails.bankName}
                  onValueChange={(value) => setBankDetails(prev => ({ ...prev, bankName: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="10-digit account number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="Name on the account"
                  value={bankDetails.accountName}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => setStep("confirm")}
                disabled={
                  !amount ||
                  !bankDetails.bankName ||
                  !bankDetails.accountNumber ||
                  !bankDetails.accountName
                }
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Withdrawal</DialogTitle>
              <DialogDescription>
                Please verify the details below
              </DialogDescription>
            </DialogHeader>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10">
                  <span className="text-lg font-medium">Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    ₦{parseFloat(amount).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{bankDetails.bankName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground ml-6">Account:</span>
                    <span className="font-medium">{bankDetails.accountNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground ml-6">Name:</span>
                    <span className="font-medium">{bankDetails.accountName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>Processing may take 1-3 business days</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleWithdraw} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Withdrawal"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Withdrawal Requested!</h3>
            <p className="text-muted-foreground mb-6">
              Your withdrawal of ₦{parseFloat(amount).toLocaleString()} has been submitted
              for processing.
            </p>
            <Button onClick={resetDialog} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
