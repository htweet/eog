import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Home, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);

  const status = searchParams.get("status");
  const tx_ref = searchParams.get("tx_ref");
  const transaction_id = searchParams.get("transaction_id");

  useEffect(() => {
    const processPayment = async () => {
      const pendingAmount = localStorage.getItem('pending_amount');
      const pendingTxRef = localStorage.getItem('pending_tx_ref');

      if (status === "successful" && user && pendingAmount) {
        try {
          // Update user's wallet balance
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

          const currentBalance = profile?.wallet_balance || 0;
          const newBalance = currentBalance + parseFloat(pendingAmount);

          await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', user.id);

          // Record the transaction
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'deposit',
            amount: parseFloat(pendingAmount),
            status: 'completed',
            description: `Flutterwave deposit - ${tx_ref || pendingTxRef}`
          });

          // Clear pending data
          localStorage.removeItem('pending_amount');
          localStorage.removeItem('pending_tx_ref');

          setSuccess(true);
          toast.success("Payment successful! Funds added to your wallet.");
        } catch (error) {
          console.error("Error processing payment:", error);
          toast.error("Payment received but failed to update wallet. Please contact support.");
        }
      } else if (status === "cancelled") {
        toast.error("Payment was cancelled");
      } else if (status === "failed") {
        toast.error("Payment failed. Please try again.");
      }

      setProcessing(false);
    };

    processPayment();
  }, [status, user, tx_ref]);

  const isSuccessful = status === "successful" && success;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              {processing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <CardTitle>Processing Payment...</CardTitle>
                  <CardDescription>Please wait while we confirm your payment</CardDescription>
                </div>
              ) : isSuccessful ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                  <CardDescription>
                    Your funds have been added to your wallet
                  </CardDescription>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                  <CardTitle className="text-red-600">Payment Failed</CardTitle>
                  <CardDescription>
                    {status === "cancelled" 
                      ? "Your payment was cancelled" 
                      : "Something went wrong with your payment"}
                  </CardDescription>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!processing && (
                <>
                  {tx_ref && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Transaction Reference</p>
                      <p className="font-mono text-sm">{tx_ref}</p>
                    </div>
                  )}
                  {transaction_id && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">{transaction_id}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => navigate("/wallet")} 
                      className="flex-1"
                      variant={isSuccessful ? "default" : "outline"}
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Go to Wallet
                    </Button>
                    <Button 
                      onClick={() => navigate("/")} 
                      variant="outline"
                      className="flex-1"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Back to Home
                    </Button>
                  </div>

                  {!isSuccessful && (
                    <Button 
                      onClick={() => navigate("/checkout")} 
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
