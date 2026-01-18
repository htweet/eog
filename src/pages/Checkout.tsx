import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Loader2, Shield, Wallet } from "lucide-react";

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

export default function Checkout() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [amount, setAmount] = useState("");
  // Fixed to NGN only
  const currency = "NGN";
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!name || !email || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setProcessing(true);

    try {
      const redirect_url = `${window.location.origin}/payment-success`;

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          email,
          name,
          amount: numAmount,
          currency,
          redirect_url
        }
      });

      if (error) throw error;

      if (data?.payment_link) {
        toast.success("Redirecting to payment gateway...");
        // Store tx_ref for verification later
        localStorage.setItem('pending_tx_ref', data.tx_ref);
        localStorage.setItem('pending_amount', amount);
        // Redirect to Flutterwave payment page
        window.location.href = data.payment_link;
      } else {
        throw new Error(data?.error || "Failed to initialize payment");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Add Funds</h1>
            <p className="text-muted-foreground mt-2">
              Securely add funds to your VouchVault wallet
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Enter your details to proceed with payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <span className="font-medium">₦ Nigerian Naira (NGN)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick Select</Label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant={amount === quickAmount.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(quickAmount.toString())}
                    >
                      ₦{quickAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handlePayment} 
                disabled={processing || !name || !email || !amount}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay with Flutterwave
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secured by Flutterwave</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
