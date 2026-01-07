import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Wallet, Plus, ArrowDownToLine, Loader2, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";

export function WalletCard() {
  const { userRole } = useAuth();
  const { balance, loading, addFunds, withdrawFunds } = useWallet();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    setProcessing(true);
    const result = await addFunds(amount);
    setProcessing(false);

    if (result.success) {
      setDepositAmount("");
      setDepositOpen(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;

    setProcessing(true);
    const result = await withdrawFunds(amount);
    setProcessing(false);

    if (result.success) {
      setWithdrawAmount("");
      setWithdrawOpen(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <Card className={userRole === "voucher" ? "gradient-trust text-accent-foreground" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <CardTitle className="text-lg">Wallet Balance</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <p className="text-4xl font-bold">${balance.toFixed(2)}</p>
            )}
            <p className={userRole === "voucher" ? "text-accent-foreground/80 text-sm" : "text-muted-foreground text-sm"}>
              Available balance
            </p>
          </div>
          <div className="flex gap-2">
            {/* Deposit Dialog */}
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button variant={userRole === "voucher" ? "secondary" : "default"} size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Funds</DialogTitle>
                  <DialogDescription>
                    Add money to your wallet to create tasks with bounties
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositAmount(amount.toString())}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleDeposit} disabled={processing || !depositAmount}>
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add ${depositAmount || "0.00"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Withdraw Dialog */}
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button variant={userRole === "voucher" ? "secondary" : "outline"} size="sm">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                  <DialogDescription>
                    Transfer money from your wallet to your bank account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min="1"
                      max={balance}
                      step="0.01"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setWithdrawAmount(balance.toString())}
                  >
                    Withdraw All
                  </Button>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) > balance}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Withdraw ${withdrawAmount || "0.00"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
