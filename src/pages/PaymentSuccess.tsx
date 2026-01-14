import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Home, Wallet, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const status = searchParams.get("status");
  const tx_ref = searchParams.get("tx_ref");
  const transaction_id = searchParams.get("transaction_id");

  useEffect(() => {
    const verifyAndProcessPayment = async () => {
      // If status is not successful, skip verification
      if (status !== "successful") {
        setVerifying(false);
        if (status === "cancelled") {
          toast.error("Payment was cancelled");
        } else if (status === "failed") {
          toast.error("Payment failed. Please try again.");
        }
        return;
      }

      // Need transaction_id for verification
      if (!transaction_id) {
        setVerifying(false);
        setVerificationError("Missing transaction ID for verification");
        return;
      }

      const pendingAmount = localStorage.getItem('pending_amount');
      const pendingTxRef = localStorage.getItem('pending_tx_ref');

      try {
        // Step 1: Verify payment with edge function
        console.log("Verifying payment with transaction_id:", transaction_id);
        
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: { 
            transaction_id,
            expected_amount: pendingAmount ? parseFloat(pendingAmount) : undefined,
            expected_currency: "NGN"
          }
        });

        if (verifyError) {
          console.error("Verification error:", verifyError);
          setVerificationError("Failed to verify payment. Please contact support.");
          setVerifying(false);
          return;
        }

        if (!verifyResult?.success) {
          console.error("Payment verification failed:", verifyResult);
          setVerificationError(verifyResult?.error || "Payment verification failed");
          setVerifying(false);
          return;
        }

        console.log("Payment verified successfully:", verifyResult);
        setVerified(true);
        setVerifying(false);
        setProcessing(true);

        // Step 2: Update wallet balance if user is logged in
        if (user && pendingAmount) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

          const currentBalance = profile?.wallet_balance || 0;
          const verifiedAmount = verifyResult.data?.amount || parseFloat(pendingAmount);
          const newBalance = currentBalance + verifiedAmount;

          await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', user.id);

          // Record the transaction
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'deposit',
            amount: verifiedAmount,
            status: 'completed',
            description: `Flutterwave deposit - ${tx_ref || pendingTxRef}`
          });

          // Clear pending data
          localStorage.removeItem('pending_amount');
          localStorage.removeItem('pending_tx_ref');

          toast.success("Payment verified! Funds added to your wallet.");
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        setVerificationError("An error occurred during verification. Please contact support.");
      } finally {
        setProcessing(false);
      }
    };

    verifyAndProcessPayment();
  }, [status, user, tx_ref, transaction_id]);

  const isVerified = verified && status === "successful";
  const isLoading = verifying || processing;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <CardTitle>{verifying ? "Verifying Payment..." : "Processing..."}</CardTitle>
                  <CardDescription>
                    {verifying 
                      ? "Securely verifying your payment with Flutterwave" 
                      : "Updating your wallet balance"}
                  </CardDescription>
                </div>
              ) : isVerified ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <ShieldCheck className="w-12 h-12 text-green-600" />
                  </div>
                  <CardTitle className="text-green-600">Payment Verified!</CardTitle>
                  <CardDescription>
                    Your payment has been securely verified and funds added to your wallet
                  </CardDescription>
                </div>
              ) : verificationError ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <ShieldX className="w-12 h-12 text-red-600" />
                  </div>
                  <CardTitle className="text-red-600">Verification Failed</CardTitle>
                  <CardDescription>{verificationError}</CardDescription>
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
              {!isLoading && (
                <>
                  {transaction_id && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">{transaction_id}</p>
                    </div>
                  )}
                  {tx_ref && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Transaction Reference</p>
                      <p className="font-mono text-sm">{tx_ref}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => navigate("/wallet")} 
                      className="flex-1"
                      variant={isVerified ? "default" : "outline"}
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

                  {!isVerified && (
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
