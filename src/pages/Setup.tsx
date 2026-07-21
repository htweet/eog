import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CheckCircle2, XCircle, Loader2, Copy, Check,
  ArrowRight, Database, User, Palette, CreditCard, Rocket,
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────
interface BrandingForm {
  app_name: string;
  app_tagline: string;
  app_logo_url: string;
}
interface AdminForm {
  full_name: string;
  email: string;
  password: string;
  confirm: string;
}
interface PaymentForm {
  paystack_public_key: string;
  paystack_secret_key: string;
}

// ─── step meta ────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: Database, label: "Connection" },
  { icon: User,     label: "Admin" },
  { icon: Palette,  label: "Branding" },
  { icon: CreditCard, label: "Payment" },
];

// ─── tiny copy button ─────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Setup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // step-1 connection
  const [connOk, setConnOk] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  // step-2 admin
  const [adminForm, setAdminForm] = useState<AdminForm>({
    full_name: "", email: "", password: "", confirm: "",
  });

  // step-3 branding
  const [branding, setBranding] = useState<BrandingForm>({
    app_name: "Vouch", app_tagline: "Nigeria's Physical Verification Network", app_logo_url: "",
  });

  // step-4 payment
  const [payment, setPayment] = useState<PaymentForm>({
    paystack_public_key: "", paystack_secret_key: "",
  });
  const [done, setDone] = useState(false);

  // redirect if setup already complete
  useEffect(() => {
    if (localStorage.getItem("vouch_setup_complete") === "true") {
      navigate("/");
    }
  }, []);

  // ── step 1: test connection ───────────────────────────────────────────────
  const testConnection = async () => {
    setTesting(true);
    setConnOk(null);
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      setConnOk(!error);
    } catch {
      setConnOk(false);
    } finally {
      setTesting(false);
    }
  };

  // ── step 2: create admin ──────────────────────────────────────────────────
  const handleAdmin = async () => {
    const { full_name, email, password, confirm } = adminForm;
    if (!full_name || !email || !password) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      // Sign up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) throw signUpErr;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error("User creation failed");

      // Sign in immediately (skip email confirmation in dev)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        // If email confirmation required, still proceed — initialize_first_admin can run later
        console.warn("Sign-in after signup:", signInErr.message);
      }

      // Set as first admin (SECURITY DEFINER fn, only works once)
      const { data: initData, error: initErr } = await supabase.rpc("initialize_first_admin", {
        p_user_id: userId,
        p_full_name: full_name,
      });

      if (initErr) throw initErr;
      const result = initData as { success?: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || "Failed to set admin role");

      toast({ title: "Admin account created!" });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ── step 3: save branding ─────────────────────────────────────────────────
  const saveBranding = async () => {
    if (!branding.app_name.trim()) {
      toast({ title: "App name required", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const entries = [
        { setting_key: "app_name",    setting_value: branding.app_name },
        { setting_key: "app_tagline", setting_value: branding.app_tagline },
        { setting_key: "app_logo_url", setting_value: branding.app_logo_url },
      ];
      for (const entry of entries) {
        await supabase
          .from("platform_settings")
          .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
      }
      toast({ title: "Branding saved!" });
      setStep(3);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ── step 4: save payment keys ─────────────────────────────────────────────
  const savePayment = async () => {
    if (!payment.paystack_public_key || !payment.paystack_secret_key) {
      toast({ title: "Both Paystack keys required", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const entries = [
        { setting_key: "paystack_public_key",  setting_value: payment.paystack_public_key },
        { setting_key: "paystack_secret_key",  setting_value: payment.paystack_secret_key },
        { setting_key: "setup_complete",        setting_value: "true" },
      ];
      for (const entry of entries) {
        await supabase
          .from("platform_settings")
          .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
      }
      localStorage.setItem("vouch_setup_complete", "true");
      toast({ title: "Setup complete! 🎉" });
      setDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = `${supabaseUrl}/functions/v1/process-payment`;

  // ── done screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Rocket className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Vouch is Ready!</h1>
            <p className="text-muted-foreground">
              Your marketplace is configured and ready to accept users.
            </p>
            <Button size="lg" className="w-full gap-2 mt-4" onClick={() => navigate("/")}>
              Launch App <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Vouch</span>
          <Badge variant="outline" className="text-xs">Setup Wizard</Badge>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done_ = i < step;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors
                  ${done_ ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {done_ ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`absolute h-0.5 w-full ${done_ ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Connection ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1 — Supabase Connection</CardTitle>
              <CardDescription>
                Verify your <code>.env</code> file has the correct Supabase credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* .env guide */}
              <div className="rounded-lg bg-muted/60 border p-4 space-y-2 text-sm font-mono">
                <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Your .env file should contain:
                </p>
                {[
                  "VITE_SUPABASE_URL=https://your-project.supabase.co",
                  "VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key",
                  "VITE_SUPABASE_PROJECT_ID=your-project-id",
                ].map((line) => (
                  <div key={line} className="flex items-center justify-between gap-2 text-xs">
                    <code className="break-all">{line}</code>
                    <CopyButton text={line.split("=")[0]} />
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Get these from your Supabase project → <strong>Settings → API</strong>. Then restart
                the dev server (<code>npm run dev</code>) and return here.
              </p>

              <Button
                onClick={testConnection}
                disabled={testing}
                variant="outline"
                className="w-full gap-2"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                {testing ? "Testing…" : "Test Connection"}
              </Button>

              {connOk === true && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Connected to Supabase successfully!</span>
                </div>
              )}

              {connOk === false && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-destructive">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">Connection failed. Check your .env and restart the server.</span>
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={!connOk}
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: Admin Account ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2 — Create Admin Account</CardTitle>
              <CardDescription>
                This will be the superadmin account for your marketplace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="e.g. Banji Olarewaju"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={adminForm.confirm}
                  onChange={(e) => setAdminForm({ ...adminForm, confirm: e.target.value })}
                />
              </div>
              <Button className="w-full gap-2" onClick={handleAdmin} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                {busy ? "Creating account…" : "Create Admin Account"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: Branding ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Branding</CardTitle>
              <CardDescription>
                Customize the marketplace name and appearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>App Name</Label>
                <Input
                  placeholder="e.g. Vouch"
                  value={branding.app_name}
                  onChange={(e) => setBranding({ ...branding, app_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  placeholder="e.g. Nigeria's Physical Verification Network"
                  value={branding.app_tagline}
                  onChange={(e) => setBranding({ ...branding, app_tagline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="url"
                  placeholder="https://your-cdn.com/logo.png"
                  value={branding.app_logo_url}
                  onChange={(e) => setBranding({ ...branding, app_logo_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 120×120px PNG with transparent background.
                </p>
              </div>

              {/* Live preview */}
              <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                {branding.app_logo_url ? (
                  <img src={branding.app_logo_url} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-bold">{branding.app_name || "Your App"}</p>
                  <p className="text-xs text-muted-foreground">{branding.app_tagline || "Your tagline"}</p>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={saveBranding} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
                {busy ? "Saving…" : "Save Branding"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 4: Payment ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4 — Payment Setup</CardTitle>
              <CardDescription>
                Connect Paystack to accept and disburse Nigerian Naira.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/40 border p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  Get your keys from{" "}
                  <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noreferrer"
                    className="text-primary underline underline-offset-2">
                    Paystack Dashboard → Settings → API Keys
                  </a>
                </p>
                <p>Use <strong>Test keys</strong> for development, <strong>Live keys</strong> for production.</p>
              </div>

              <div className="space-y-2">
                <Label>Paystack Public Key</Label>
                <Input
                  placeholder="pk_test_..."
                  value={payment.paystack_public_key}
                  onChange={(e) => setPayment({ ...payment, paystack_public_key: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Paystack Secret Key</Label>
                <Input
                  type="password"
                  placeholder="sk_test_..."
                  value={payment.paystack_secret_key}
                  onChange={(e) => setPayment({ ...payment, paystack_secret_key: e.target.value })}
                />
              </div>

              {/* Webhook instructions */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                  ⚠️ Also add this webhook URL in Paystack Dashboard → Settings → Webhooks:
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-background rounded px-2 py-1 border text-xs font-mono break-all">
                  <span className="flex-1">{webhookUrl}</span>
                  <CopyButton text={webhookUrl} />
                </div>
              </div>

              <Button className="w-full gap-2" onClick={savePayment} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {busy ? "Saving…" : "Complete Setup"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => {
                  localStorage.setItem("vouch_setup_complete", "true");
                  setDone(true);
                }}
              >
                Skip for now (configure later in Admin panel)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
