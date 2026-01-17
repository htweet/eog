import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProBadge } from "@/components/pro/ProBadge";
import { Lock, Crown, DollarSign, MapPin, ArrowRight, Sparkles } from "lucide-react";

interface ProTask {
  id: string;
  title: string;
  category: string;
  bounty_amount: number;
  address: string;
  pro_fee_multiplier: number | null;
  created_at: string;
}

interface ProOpportunitiesSectionProps {
  onUpgrade?: () => void;
}

export function ProOpportunitiesSection({ onUpgrade }: ProOpportunitiesSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proTasks, setProTasks] = useState<ProTask[]>([]);
  const [voucherTier, setVoucherTier] = useState<string>("standard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProTasksAndTier();
    }
  }, [user]);

  const fetchProTasksAndTier = async () => {
    if (!user) return;

    // Fetch voucher tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("voucher_tier")
      .eq("id", user.id)
      .single();

    if (profile?.voucher_tier) {
      setVoucherTier(profile.voucher_tier);
    }

    // Fetch pro-only tasks
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, category, bounty_amount, address, pro_fee_multiplier, created_at")
      .eq("status", "open")
      .eq("required_tier", "pro_only")
      .order("bounty_amount", { ascending: false })
      .limit(5);

    if (!error && tasks) {
      setProTasks(tasks);
    }

    setLoading(false);
  };

  const isPro = voucherTier === "pro";
  const totalProBounty = proTasks.reduce((sum, t) => sum + t.bounty_amount, 0);

  if (loading) {
    return null;
  }

  // If user is already Pro, don't show this section
  if (isPro) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-amber-600/5">
      {/* Lock overlay for non-Pro users */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Pro Opportunities</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Unlock {proTasks.length} premium tasks worth up to <span className="text-amber-500 font-semibold">${totalProBounty.toFixed(0)}</span> in potential earnings
          </p>
          <Button 
            onClick={() => navigate("/settings")} 
            className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            <Crown className="h-4 w-4" />
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardHeader className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <CardTitle>Pro Opportunities</CardTitle>
          <ProBadge tier="pro" size="sm" />
        </div>
        <CardDescription>
          Higher-paying tasks from verified businesses
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-3 opacity-50 pointer-events-none">
          {proTasks.length > 0 ? (
            proTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {task.address.slice(0, 30)}...
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <DollarSign className="h-4 w-4" />
                    {task.bounty_amount.toFixed(0)}
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                    +{((task.pro_fee_multiplier || 1.4) - 1) * 100}% Premium
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 text-amber-500/50" />
              <p>No Pro tasks available right now</p>
              <p className="text-sm">Check back soon for premium opportunities</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
