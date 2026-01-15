import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Keystone Bank",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
  "Opay",
  "Palmpay",
  "Kuda Bank",
  "Moniepoint",
];

interface WithdrawalSettingsData {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export function WithdrawalSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WithdrawalSettingsData>({
    bank_name: "",
    account_number: "",
    account_name: "",
  });
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    const { data, error } = await (supabase as any)
      .from("withdrawal_settings")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (!error && data) {
      setSettings({
        bank_name: data.bank_name || "",
        account_number: data.account_number || "",
        account_name: data.account_name || "",
      });
      setIsConfigured(!!data.bank_name && !!data.account_number);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!settings.bank_name || !settings.account_number || !settings.account_name) {
      toast.error("Please fill all fields");
      return;
    }

    if (settings.account_number.length !== 10) {
      toast.error("Account number must be 10 digits");
      return;
    }

    setSaving(true);

    const { error } = await (supabase as any)
      .from("withdrawal_settings")
      .upsert({
        user_id: user.id,
        bank_name: settings.bank_name,
        account_number: settings.account_number,
        account_name: settings.account_name,
      }, {
        onConflict: "user_id"
      });

    if (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } else {
      toast.success("Withdrawal settings saved!");
      setIsConfigured(true);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            <CardTitle>Withdrawal Settings</CardTitle>
          </div>
          {isConfigured ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Set
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure your bank details for receiving withdrawals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Select
            value={settings.bank_name}
            onValueChange={(value) => setSettings({ ...settings, bank_name: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your bank" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_BANKS.map((bank) => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Account Number</Label>
          <Input
            type="text"
            maxLength={10}
            placeholder="Enter 10-digit account number"
            value={settings.account_number}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
              setSettings({ ...settings, account_number: value });
            }}
          />
          <p className="text-xs text-muted-foreground">
            {settings.account_number.length}/10 digits
          </p>
        </div>

        <div className="space-y-2">
          <Label>Account Name</Label>
          <Input
            type="text"
            placeholder="Enter account holder name"
            value={settings.account_name}
            onChange={(e) => setSettings({ ...settings, account_name: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            This should match the name on your bank account
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Bank Details
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your bank details are encrypted and securely stored. They will be used only for processing withdrawals.
        </p>
      </CardContent>
    </Card>
  );
}
