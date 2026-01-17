import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProVoucher } from "@/hooks/useProVoucher";
import { ProBadge } from "./ProBadge";
import { 
  Building2, 
  Crown, 
  Check, 
  Loader2, 
  Star,
  Users,
  TrendingUp,
  Shield,
  Clock
} from "lucide-react";

export function ProUpgradeCard() {
  const { 
    isPro, 
    isPendingPro, 
    upgradeRequest, 
    proProfile,
    requestProUpgrade, 
    loading 
  } = useProVoucher();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!companyName || !registrationNumber) return;
    
    setSubmitting(true);
    const result = await requestProUpgrade(companyName, registrationNumber);
    setSubmitting(false);
    
    if (result.success) {
      setDialogOpen(false);
    }
  };

  if (isPro) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Pro Business Account
                  <ProBadge tier="pro" size="sm" />
                </CardTitle>
                <CardDescription>
                  {proProfile?.company_details?.company_name || "Your Business"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Verified Business</p>
                <p className="text-xs text-muted-foreground">RC: {proProfile?.company_details?.registration_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Team Size</p>
                <p className="text-xs text-muted-foreground">{proProfile?.company_details?.staff_count || 0} members</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Pro Tasks</p>
                <p className="text-xs text-muted-foreground">Premium access</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isPendingPro) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Pro Upgrade Pending
                <ProBadge tier="pending_pro" size="sm" />
              </CardTitle>
              <CardDescription>
                Your application is under review
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              We're reviewing your business documents. This usually takes 1-2 business days.
              You'll receive a notification once your account is upgraded.
            </p>
          </div>
          {upgradeRequest && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company Name:</span>
                <span className="font-medium">{upgradeRequest.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration Number:</span>
                <span className="font-medium">{upgradeRequest.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">{new Date(upgradeRequest.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const benefits = [
    { icon: TrendingUp, label: "Access premium Pro-only tasks with 40% higher payouts" },
    { icon: Users, label: "Build a team and dispatch staff to verification sites" },
    { icon: Building2, label: "Display 'Registered Business' badge to build trust" },
    { icon: Star, label: "Priority placement in voucher listings" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-500">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>Upgrade to Pro</CardTitle>
            <CardDescription>
              Unlock premium features for your business
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <benefit.icon className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground">{benefit.label}</p>
            </div>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              <Crown className="h-4 w-4 mr-2" />
              Apply for Pro Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Pro Account</DialogTitle>
              <DialogDescription>
                Submit your business details for verification. Approval typically takes 1-2 business days.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="e.g., FixIt Pros Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-number">Business Registration Number (RC)</Label>
                <Input
                  id="reg-number"
                  placeholder="e.g., RC123456"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your CAC registration number or equivalent business ID
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !companyName || !registrationNumber}
                className="bg-gradient-to-r from-amber-500 to-amber-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
