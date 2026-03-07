import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { LocationPicker } from "@/components/task/LocationPicker";
import { ChecklistBuilder, ChecklistItem } from "@/components/task/ChecklistBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, ArrowLeft, ClipboardList, AlertCircle, Wallet, Crown, Users } from "lucide-react";

const categories = [
  { value: "auto", label: "Automobiles", icon: "🚗" },
  { value: "realestate", label: "Real Estate", icon: "🏠" },
  { value: "electronics", label: "Electronics", icon: "📱" },
  { value: "general", label: "General Items", icon: "📦" },
];

const PRO_FEE_MULTIPLIER = 1.4; // 40% premium for Pro vouchers

export default function CreateTask() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance, holdEscrow, loading: walletLoading } = useWallet();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [bountyAmount, setBountyAmount] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiredTier, setRequiredTier] = useState<"any" | "pro_only">("any");

  const parsedBounty = parseFloat(bountyAmount) || 0;
  const proFeeMultiplier = requiredTier === "pro_only" ? PRO_FEE_MULTIPLIER : 1;
  const finalBounty = parsedBounty * proFeeMultiplier;
  const hasInsufficientBalance = finalBounty > balance;

  const handleCoordinatesChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a task",
        variant: "destructive",
      });
      return;
    }

    if (userRole !== "requester") {
      toast({
        title: "Error",
        description: "Only requesters can create tasks",
        variant: "destructive",
      });
      return;
    }

    if (!title || !category || !bountyAmount || !address) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (checklist.length === 0) {
      toast({
        title: "No checklist",
        description: "Please add at least one checklist item",
        variant: "destructive",
      });
      return;
    }

    // Check wallet balance for escrow
    if (finalBounty > balance) {
      toast({
        title: "Insufficient balance",
        description: `You need ₦${finalBounty.toFixed(2)} in your wallet. Current balance: ₦${balance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // First create the task
    const { data, error } = await supabase.from("tasks").insert([{
      title,
      description,
      category,
      bounty_amount: finalBounty,
      address,
      latitude,
      longitude,
      checklist: checklist as unknown as undefined,
      requester_id: user.id,
      status: "open",
      required_tier: requiredTier,
      pro_fee_multiplier: proFeeMultiplier,
    }]).select().single();

    if (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Hold escrow for the bounty amount
    const escrowResult = await holdEscrow(data.id, finalBounty);
    if (!escrowResult.success) {
      // Rollback - delete the task if escrow fails
      await supabase.from("tasks").delete().eq("id", data.id);
      toast({
        title: "Error",
        description: escrowResult.error || "Failed to hold escrow",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Task created!",
      description: `₦${finalBounty.toFixed(2)} held in escrow until verification is complete`,
    });
    navigate(`/task/${data.id}`);

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container max-w-2xl py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              <CardTitle>Create Verification Task</CardTitle>
            </div>
            <CardDescription>
              Post a task for vouchers to verify items at a location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Verify 2020 Toyota Camry condition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voucher Type Selection */}
              <div className="space-y-3">
                <Label>Voucher Type *</Label>
                <RadioGroup
                  value={requiredTier}
                  onValueChange={(value) => setRequiredTier(value as "any" | "pro_only")}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="relative">
                    <RadioGroupItem
                      value="any"
                      id="tier-any"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="tier-any"
                      className="flex flex-col items-start p-4 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">Standard Vouch</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Quick, affordable checks by verified locals
                      </p>
                      <span className="mt-2 text-xs text-muted-foreground">Base price</span>
                    </Label>
                  </div>

                  <div className="relative">
                    <RadioGroupItem
                      value="pro_only"
                      id="tier-pro"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="tier-pro"
                      className="flex flex-col items-start p-4 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-500/5 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold">Pro Vouch</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                          +40%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Detailed inspection by a registered business. Includes formal report.
                      </p>
                      <span className="mt-2 text-xs text-amber-600 font-medium">Premium quality</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any additional details about the verification..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Bounty Amount */}
              <div className="space-y-2">
                <Label htmlFor="bounty">Base Bounty Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="bounty"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="5000"
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(e.target.value)}
                    className={`pl-10 ${hasInsufficientBalance ? 'border-destructive' : ''}`}
                    required
                  />
                </div>
                
                {/* Pricing breakdown */}
                {parsedBounty > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base bounty</span>
                      <span>₦{parsedBounty.toFixed(2)}</span>
                    </div>
                    {requiredTier === "pro_only" && (
                      <div className="flex justify-between text-sm text-amber-600">
                        <span>Pro premium (+40%)</span>
                        <span>₦{(parsedBounty * 0.4).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total (held in escrow)</span>
                      <span className="text-primary">₦{finalBounty.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <p className="text-muted-foreground">
                    This amount will be held in escrow until verification is complete
                  </p>
                  <p className="flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Balance: ₦{balance.toFixed(2)}
                  </p>
                </div>
                {hasInsufficientBalance && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient balance. You need ₦{finalBounty.toFixed(2)} but only have ₦{balance.toFixed(2)}.
                      <Button variant="link" className="p-0 h-auto ml-1" onClick={() => navigate('/wallet')}>
                        Add funds
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Location Picker */}
              <LocationPicker
                address={address}
                onAddressChange={setAddress}
                onCoordinatesChange={handleCoordinatesChange}
                latitude={latitude}
                longitude={longitude}
              />

              {/* Checklist Builder */}
              <ChecklistBuilder
                checklist={checklist}
                onChecklistChange={setChecklist}
                title={title}
                category={category}
                description={description}
              />

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !title || !category || !bountyAmount || !address || checklist.length === 0 || hasInsufficientBalance || walletLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    Create Task
                    {requiredTier === "pro_only" && (
                      <Crown className="ml-2 h-4 w-4 text-amber-300" />
                    )}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
