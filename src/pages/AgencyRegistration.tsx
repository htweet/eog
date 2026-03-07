import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useProVoucher } from "@/hooks/useProVoucher";
import {
  Building2, Crown, Shield, Users, TrendingUp, Star,
  ArrowLeft, Loader2, CheckCircle, Clock, FileText, CreditCard,
} from "lucide-react";

const STEPS = ["Business Info", "KYC Documents", "Select Plan", "Review & Submit"];

interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: any;
  is_popular: boolean;
  badge_text: string | null;
}

export default function AgencyRegistration() {
  const navigate = useNavigate();
  const { user, userRole, addRole, allRoles } = useAuth();
  const { toast } = useToast();
  const { isPro, isPendingPro, upgradeRequest } = useProVoucher();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Business Info
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  // Step 2: KYC
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [kycAddress, setKycAddress] = useState("");

  // Step 3: Plan Selection
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);

  const hasVoucherRole = allRoles.includes("voucher");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setPlansLoading(true);
    const { data } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) {
      setPlans(data as PricingPlan[]);
      const popular = data.find(p => p.is_popular);
      if (popular) setSelectedPlanId(popular.id);
      else if (data.length > 0) setSelectedPlanId(data[0].id);
    }
    setPlansLoading(false);
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Already submitted
  if (isPendingPro) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container max-w-2xl py-8">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <Card className="border-amber-500/30">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle>Application Under Review</CardTitle>
              <CardDescription>Your agency registration is being reviewed by our team.</CardDescription>
            </CardHeader>
            <CardContent>
              {upgradeRequest && (
                <div className="p-4 rounded-lg bg-muted space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span className="font-medium">{upgradeRequest.company_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Registration #</span><span className="font-medium">{upgradeRequest.registration_number}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{new Date(upgradeRequest.created_at).toLocaleDateString()}</span></div>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                This usually takes 1-2 business days. You'll be notified once approved.
              </p>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container max-w-2xl py-8">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <Card className="border-green-500/30">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle>You're Already a Verified Agency!</CardTitle>
              <CardDescription>Access your agency dashboard to manage your team and tasks.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate("/dashboard/agency")}>
                <Building2 className="h-4 w-4 mr-2" />Go to Agency Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
    if (!companyName || !registrationNumber) {
      toast({ title: "Missing Info", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!selectedPlanId) {
      toast({ title: "Select a Plan", description: "Please choose a subscription plan", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // If user doesn't have voucher role, add it first
      if (!hasVoucherRole) {
        const { error: roleError } = await addRole("voucher");
        if (roleError) throw roleError;
      }

      // Create the pro upgrade request with KYC
      const { error } = await supabase.from("pro_upgrade_requests").insert({
        user_id: user.id,
        company_name: companyName,
        registration_number: registrationNumber,
        status: "pending",
        kyc_status: idNumber ? "submitted" : "not_started",
        kyc_id_type: idType || null,
        kyc_id_number: idNumber || null,
        kyc_address: kycAddress || businessAddress || null,
        document_urls: [],
      });

      if (error) throw error;

      // Create a pending subscription linked to the selected plan
      const { error: subError } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: selectedPlanId,
        status: "pending",
        started_at: new Date().toISOString(),
        admin_notes: `Pending agency approval for ${companyName}`,
      });

      if (subError) throw subError;

      // Update profile to pending_pro
      await supabase.from("profiles").update({
        voucher_tier: "pending_pro",
        company_details: {
          company_name: companyName,
          registration_number: registrationNumber,
          business_address: businessAddress,
          business_description: businessDescription,
        },
      } as any).eq("id", user.id);

      // Notify admins
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (adminRoles) {
        const notifications = adminRoles.map(r => ({
          user_id: r.user_id,
          type: "agency_application",
          title: "New Agency Application",
          message: `${companyName} has applied for agency status with ${selectedPlan?.name || "a"} plan.`,
        }));
        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }

      toast({ title: "Application Submitted! 🎉", description: "Your agency registration is under review." });
      navigate("/");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({ title: "Error", description: error.message || "Failed to submit application", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { icon: TrendingUp, text: "Access premium Pro-only tasks with 40% higher payouts" },
    { icon: Users, text: "Build and manage a team of field agents" },
    { icon: Building2, text: "Display 'Verified Business' badge" },
    { icon: Star, text: "Priority placement in voucher listings" },
    { icon: Shield, text: "Dedicated agency dashboard with dispatch tools" },
  ];

  const formatFeatures = (features: any): string[] => {
    if (Array.isArray(features)) {
      return features.map(f => typeof f === "string" ? f : (f.text || f.label || f.name || JSON.stringify(f)));
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container max-w-2xl py-8">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />Back
        </Button>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 mb-4">
            <Crown className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Become a Verified Agency</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Register your business to unlock premium features, manage teams, and access high-value tasks.
          </p>
        </div>

        {/* Benefits */}
        <Card className="mb-6 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-sm">{b.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-sm hidden sm:inline ${i <= step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <Separator className="w-8" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Business Information</CardTitle>
                <CardDescription>Tell us about your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input id="company" placeholder="e.g., FixIt Pros Ltd" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rc">Business Registration Number (RC) *</Label>
                  <Input id="rc" placeholder="e.g., RC123456" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Your CAC registration number or equivalent business ID</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input id="address" placeholder="e.g., 15 Marina Road, Lagos" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Business Description</Label>
                  <Textarea id="desc" placeholder="What does your company do?" value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} rows={3} />
                </div>
                <Button className="w-full" onClick={() => setStep(1)} disabled={!companyName || !registrationNumber}>
                  Continue to KYC
                </Button>
              </CardContent>
            </>
          )}

          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />KYC Verification</CardTitle>
                <CardDescription>Provide identity documents for verification (optional but speeds up approval)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={idType} onChange={e => setIdType(e.target.value)}>
                    <option value="national_id">National ID</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="passport">International Passport</option>
                    <option value="voters_card">Voter's Card</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idnum">ID Number</Label>
                  <Input id="idnum" placeholder="Enter your ID number" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kycaddr">Residential Address</Label>
                  <Input id="kycaddr" placeholder="Your home address" value={kycAddress} onChange={e => setKycAddress(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(2)} className="flex-1">Select Plan</Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Choose Your Plan</CardTitle>
                <CardDescription>Select a subscription plan for your agency. Your subscription activates upon approval.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {plansLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No plans available at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      const features = formatFeatures(plan.features);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{plan.name}</h4>
                                {plan.is_popular && (
                                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Popular</Badge>
                                )}
                                {plan.badge_text && (
                                  <Badge variant="outline" className="text-xs">{plan.badge_text}</Badge>
                                )}
                              </div>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                              )}
                              {features.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {features.slice(0, 4).map((f, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-xl font-bold">₦{plan.price.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">/{plan.billing_period}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-primary/20">
                              <p className="text-xs text-primary font-medium flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Selected
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1" disabled={!selectedPlanId}>
                    Review Application
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />Review & Submit</CardTitle>
                <CardDescription>Please review your information before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted space-y-3 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Business Details</h4>
                  <div className="flex justify-between"><span className="text-muted-foreground">Company Name</span><span className="font-medium">{companyName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Registration #</span><span className="font-medium">{registrationNumber}</span></div>
                  {businessAddress && <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{businessAddress}</span></div>}
                </div>
                {idNumber && (
                  <div className="p-4 rounded-lg bg-muted space-y-3 text-sm">
                    <h4 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" />KYC Information</h4>
                    <div className="flex justify-between"><span className="text-muted-foreground">ID Type</span><span className="capitalize">{idType.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">ID Number</span><span>{idNumber}</span></div>
                    {kycAddress && <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{kycAddress}</span></div>}
                  </div>
                )}
                {selectedPlan && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3 text-sm">
                    <h4 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />Subscription Plan</h4>
                    <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium">{selectedPlan.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-bold">₦{selectedPlan.price.toLocaleString()}/{selectedPlan.billing_period}</span></div>
                    <p className="text-xs text-muted-foreground">Your subscription activates once your agency is approved.</p>
                  </div>
                )}
                {!hasVoucherRole && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-600 dark:text-amber-400">
                    <strong>Note:</strong> A voucher role will be added to your account to enable agency features.
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><Crown className="h-4 w-4 mr-2" />Submit Application</>}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
