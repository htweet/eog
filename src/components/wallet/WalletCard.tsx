import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2, TrendingUp, CreditCard } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WithdrawalFlow } from "./WithdrawalFlow";

export function WalletCard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { balance, loading, refetch } = useWallet();
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);

  useEffect(() => {
    if (user) {
      fetchWithdrawable();
    }
  }, [user]);

  const fetchWithdrawable = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_my_wallet");
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setWithdrawableBalance(Number(row.withdrawable_balance) || 0);
    }
  };

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
              <>
                <p className="text-4xl font-bold">₦{balance.toLocaleString()}</p>
                {userRole === "voucher" && withdrawableBalance > 0 && (
                  <p className="text-sm opacity-80">
                    Withdrawable: ₦{withdrawableBalance.toLocaleString()}
                  </p>
                )}
              </>
            )}
            <p className={userRole === "voucher" ? "text-accent-foreground/80 text-sm" : "text-muted-foreground text-sm"}>
              Available balance
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={userRole === "voucher" ? "secondary" : "default"} 
              size="sm"
              onClick={() => navigate("/checkout")}
            >
              <CreditCard className="mr-1 h-4 w-4" />
              Add Funds
            </Button>
            {userRole === "voucher" ? (
              <WithdrawalFlow 
                withdrawableBalance={withdrawableBalance} 
                onSuccess={() => { refetch(); fetchWithdrawable(); }} 
              />
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/wallet")}
              >
                <TrendingUp className="mr-1 h-4 w-4" />
                View History
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
