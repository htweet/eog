import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, ArrowRight, Sparkles, Loader2, Crown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: string[];
  is_popular: boolean;
  badge_text: string | null;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  plan?: PricingPlan;
}

export default function Subscribe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (user) fetchSubscription();
  }, [user]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setPlans(data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features as string[] : [],
      })));
    }
    setLoading(false);
  };

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*, plan:pricing_plans(*)")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const plan = Array.isArray(data.plan) ? data.plan[0] : data.plan;
      setCurrentSub({
        ...data,
        plan: plan ? { ...plan, features: Array.isArray(plan.features) ? plan.features as string[] : [] } : undefined,
      });
    }
  };

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSubscribing(plan.id);
    try {
      const expiresAt = new Date();
      if (plan.billing_period === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Cancel existing sub if any
      if (currentSub) {
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", currentSub.id);
      }

      const { error } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast({ title: "Subscribed!", description: `You're now on the ${plan.name} plan.` });
      await fetchSubscription();
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Subscription Plans
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upgrade your experience with premium features and priority access.
          </p>
        </div>

        {/* Current subscription */}
        {currentSub && currentSub.plan && (
          <Card className="max-w-md mx-auto mb-8 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{currentSub.plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentSub.expires_at
                      ? `Expires ${new Date(currentSub.expires_at).toLocaleDateString()}`
                      : "Active"}
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = currentSub?.plan_id === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-all hover:shadow-lg ${
                  plan.is_popular ? "border-primary shadow-md scale-[1.02]" : "border-border/50"
                }`}
              >
                {plan.badge_text && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                      {plan.badge_text}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        {plan.price === 0 ? "Free" : `₦${plan.price.toLocaleString()}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground text-sm">/{plan.billing_period}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : plan.is_popular ? "default" : "outline"}
                    disabled={isCurrentPlan || subscribing === plan.id}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {subscribing === plan.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      <>Subscribe <ArrowRight className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
