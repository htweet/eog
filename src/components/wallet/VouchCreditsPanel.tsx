import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVouchCredits } from "@/hooks/useVouchCredits";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Flame, Gift, Trophy, Copy, Check, ArrowRightLeft,
  Star, Loader2, Users, TrendingUp
} from "lucide-react";

const MILESTONES_CONFIG: Record<string, { label: string; emoji: string }> = {
  first_task: { label: "First Task Completed", emoji: "🎉" },
  ten_tasks: { label: "10 Tasks Completed", emoji: "🏆" },
  fifty_tasks: { label: "50 Tasks Completed", emoji: "💎" },
  hundred_tasks: { label: "100 Tasks Completed", emoji: "👑" },
  first_pro: { label: "Became Pro Voucher", emoji: "⭐" },
  first_flash: { label: "First Flash Bounty", emoji: "⚡" },
};

const VC_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  streak_bonus: { label: "Streak Bonus", color: "text-orange-500" },
  referral: { label: "Referral Reward", color: "text-violet-500" },
  milestone: { label: "Milestone", color: "text-yellow-500" },
  task_completion: { label: "Task Reward", color: "text-green-500" },
  first_deposit_bonus: { label: "Deposit Bonus", color: "text-blue-500" },
  spend_feature: { label: "Spent on Feature", color: "text-red-400" },
  spend_express: { label: "Spent on Express", color: "text-red-400" },
  convert_to_naira: { label: "Converted to ₦", color: "text-amber-500" },
};

export function VouchCreditsPanel() {
  const { credits, streak, transactions, milestones, referralCode, referralCount, loading, convertToNaira, claimReferral } = useVouchCredits();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [convertAmount, setConvertAmount] = useState(100);
  const [converting, setConverting] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [claiming, setClaiming] = useState(false);

  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const handleConvert = async () => {
    if (convertAmount < 100) return;
    setConverting(true);
    const result = await convertToNaira(convertAmount);
    if (result.success) {
      toast({
        title: "Converted!",
        description: `${convertAmount} VC → ₦${(convertAmount / 100) * 50}`,
      });
    } else {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
    }
    setConverting(false);
  };

  const handleClaimReferral = async () => {
    if (!referralInput.trim()) return;
    setClaiming(true);
    const result = await claimReferral(referralInput.trim());
    if (result.success) {
      toast({ title: "Referral claimed!", description: result.message });
      setReferralInput("");
    } else {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
    }
    setClaiming(false);
  };

  const nairaValue = Math.floor(convertAmount / 100) * 50;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* VC Balance Header */}
      <Card className="bg-gradient-to-br from-violet-600 to-purple-700 text-white border-0">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-violet-200 text-sm font-medium">Vouch Credits™</p>
              <p className="text-4xl font-bold mt-1">{credits.balance.toLocaleString()} <span className="text-2xl text-violet-300">VC</span></p>
              <p className="text-violet-300 text-xs mt-1">Lifetime earned: {credits.lifetime_earned.toLocaleString()} VC</p>
            </div>
            <div className="text-right">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center ml-auto">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs text-violet-200 mt-2">≈ ₦{((credits.balance / 100) * 50).toLocaleString()}</p>
            </div>
          </div>

          {/* Streak indicator */}
          {streak.current_streak > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <Flame className="h-4 w-4 text-orange-300" />
              <span className="text-sm font-semibold">{streak.current_streak}-day streak</span>
              <span className="text-xs text-violet-200 ml-auto">Best: {streak.longest_streak}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="earn">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="earn" className="text-xs">Earn</TabsTrigger>
          <TabsTrigger value="spend" className="text-xs">Spend</TabsTrigger>
          <TabsTrigger value="referral" className="text-xs">Refer</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
        </TabsList>

        {/* EARN TAB */}
        <TabsContent value="earn" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">How to Earn Vouch Credits</p>
              <div className="space-y-2">
                {[
                  { icon: "✅", label: "Complete a task", reward: "+5 VC" },
                  { icon: "⚡", label: "Complete a Flash Bounty", reward: "+15 VC" },
                  { icon: "🔥", label: "7-day completion streak", reward: "+50 VC" },
                  { icon: "🏆", label: "30-day streak", reward: "+200 VC" },
                  { icon: "👥", label: "Refer a friend (they join)", reward: "+100 VC + ₦500" },
                  { icon: "💰", label: "First deposit bonus", reward: "+50 VC" },
                  { icon: "🎉", label: "First task completed", reward: "+25 VC" },
                  { icon: "💎", label: "50 tasks milestone", reward: "+300 VC" },
                ].map(({ icon, label, reward }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm flex items-center gap-2">
                      <span>{icon}</span>{label}
                    </span>
                    <span className="text-xs font-bold text-green-600">{reward}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          {milestones.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Achieved Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {milestones.map((m) => {
                  const config = MILESTONES_CONFIG[m.milestone_key];
                  return (
                    <div key={m.milestone_key} className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <span>{config?.emoji || "🏅"}</span>
                        {config?.label || m.milestone_key}
                      </span>
                      <Badge variant="secondary" className="text-xs">+{m.vc_reward} VC</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SPEND TAB */}
        <TabsContent value="spend" className="space-y-3 mt-3">
          {/* Convert to Naira */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                Convert VC → Naira
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <p className="text-xs text-muted-foreground">100 VC = ₦50 · Minimum 100 VC · Multiples of 100</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(Math.max(100, Math.round(Number(e.target.value) / 100) * 100))}
                    className="text-center font-bold"
                  />
                </div>
                <div className="flex items-center px-3 bg-muted rounded-lg text-sm font-medium">
                  ≈ ₦{nairaValue.toLocaleString()}
                </div>
              </div>
              <Button
                onClick={handleConvert}
                className="w-full"
                disabled={converting || convertAmount > credits.balance || credits.balance < 100}
              >
                {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                Convert {convertAmount} VC to ₦{nairaValue.toLocaleString()}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">What You Can Spend VC On</p>
              <div className="space-y-2">
                {[
                  { icon: "📌", label: "Featured Bounty (pin to top)", cost: "50 VC", equiv: "≈ ₦25" },
                  { icon: "⚡", label: "Express Queue (priority matching)", cost: "30 VC", equiv: "≈ ₦15" },
                  { icon: "📄", label: "Verification Certificate PDF", cost: "20 VC", equiv: "≈ ₦10" },
                  { icon: "💱", label: "Convert to Naira (100 VC = ₦50)", cost: "100 VC", equiv: "₦50" },
                ].map(({ icon, label, cost, equiv }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm flex items-center gap-2">
                      <span>{icon}</span>{label}
                    </span>
                    <div className="text-right">
                      <p className="text-xs font-bold text-violet-600">{cost}</p>
                      <p className="text-xs text-muted-foreground">{equiv}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFERRAL TAB */}
        <TabsContent value="referral" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="font-bold text-lg">Refer &amp; Earn</p>
                <p className="text-sm text-muted-foreground">Invite friends and earn <strong className="text-violet-600">100 VC + ₦500</strong> per successful referral</p>
              </div>

              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Your referral link</p>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="text-xs h-8 font-mono" />
                  <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 w-8 p-0 shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold text-violet-600">{referralCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                  <p className="text-sm font-bold text-violet-600">{referralCount * 100} VC + ₦{(referralCount * 500).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold mb-2">Have a referral code? Enter it here:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="ABCD1234"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono uppercase"
                  />
                  <Button size="sm" onClick={handleClaimReferral} disabled={claiming || !referralInput.trim()}>
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-3">
          <Card>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No VC transactions yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {transactions.map((tx) => {
                    const config = VC_TYPE_LABELS[tx.type] || { label: tx.type, color: "text-foreground" };
                    const isPositive = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${config.color}`}>{config.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{tx.description || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ml-3 ${isPositive ? "text-green-600" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}{tx.amount} VC
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
