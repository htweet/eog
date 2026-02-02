import { useState } from "react";
import { useProVoucher } from "@/hooks/useProVoucher";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Crown,
  CheckCircle,
  Upload,
  Building2,
  FileText,
  Loader2,
  Star,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";

export function ProUpgradeFlow() {
  const { user } = useAuth();
  const { isPro, isPendingPro, upgradeRequest, requestProUpgrade, loading } = useProVoucher();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const proFeatures = [
    { icon: <Star className="h-5 w-5" />, title: "Priority Access", description: "Get first dibs on high-value tasks" },
    { icon: <TrendingUp className="h-5 w-5" />, title: "Higher Earnings", description: "Earn 40% more on Pro-only tasks" },
    { icon: <Users className="h-5 w-5" />, title: "Team Management", description: "Add staff members to your agency" },
    { icon: <Zap className="h-5 w-5" />, title: "Instant Payouts", description: "Get paid faster with priority processing" },
  ];

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;

    setUploading(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/pro-docs/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("dispute-evidence")
        .upload(filePath, file);

      if (!error) {
        urls.push(filePath);
      }
    }

    setDocumentUrls(prev => [...prev, ...urls]);
    setUploading(false);
    toast.success(`${files.length} document(s) uploaded`);
  };

  const handleSubmit = async () => {
    if (!companyName.trim() || !registrationNumber.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    const result = await requestProUpgrade(companyName, registrationNumber, documentUrls);

    if (result.success) {
      setDialogOpen(false);
      setStep(1);
      setCompanyName("");
      setRegistrationNumber("");
      setDocumentUrls([]);
    }
    setSubmitting(false);
  };

  if (isPro) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Pro Account Active
            </CardTitle>
            <Badge className="bg-primary">PRO</Badge>
          </div>
          <CardDescription>
            You have access to all Pro features and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <div className="text-primary">{feature.icon}</div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isPendingPro || upgradeRequest?.status === "pending") {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Pro Upgrade Pending
            </CardTitle>
            <Badge variant="outline" className="border-amber-500 text-amber-500">
              Under Review
            </Badge>
          </div>
          <CardDescription>
            Your Pro upgrade request is being reviewed by our team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{upgradeRequest?.company_name || "Company"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Reg: {upgradeRequest?.registration_number || "N/A"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We'll notify you once your application is processed. This usually takes 1-2 business days.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Upgrade to Pro
        </CardTitle>
        <CardDescription>
          Unlock premium features and earn more with Pro status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {proFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">{feature.icon}</div>
              <div>
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Crown className="mr-2 h-4 w-4" />
              Apply for Pro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pro Upgrade Application</DialogTitle>
              <DialogDescription>
                {step === 1 ? "Tell us about your business" : "Upload verification documents"}
              </DialogDescription>
            </DialogHeader>

            <Progress value={step * 50} className="h-1" />

            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter your registered company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNumber">Registration Number *</Label>
                  <Input
                    id="regNumber"
                    placeholder="CAC Registration Number"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!companyName.trim() || !registrationNumber.trim()}
                >
                  Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Documents</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload CAC certificate, ID, or other proof of business
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    disabled={uploading}
                  />
                  {documentUrls.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {documentUrls.length} document(s) uploaded
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={submitting || uploading}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
