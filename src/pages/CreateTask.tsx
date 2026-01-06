import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { LocationPicker } from "@/components/task/LocationPicker";
import { ChecklistBuilder, ChecklistItem } from "@/components/task/ChecklistBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, ArrowLeft, ClipboardList } from "lucide-react";

const categories = [
  { value: "auto", label: "Automobiles", icon: "🚗" },
  { value: "realestate", label: "Real Estate", icon: "🏠" },
  { value: "electronics", label: "Electronics", icon: "📱" },
  { value: "general", label: "General Items", icon: "📦" },
];

export default function CreateTask() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [bountyAmount, setBountyAmount] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);

    const { data, error } = await supabase.from("tasks").insert([{
      title,
      category,
      bounty_amount: parseFloat(bountyAmount),
      address,
      latitude,
      longitude,
      checklist: checklist as unknown as undefined, // Cast to bypass strict typing
      requester_id: user.id,
      status: "open",
    }]).select().single();

    if (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task created!",
        description: "Your verification task is now live",
      });
      navigate(`/task/${data.id}`);
    }

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
                <Label htmlFor="bounty">Bounty Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="bounty"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="25.00"
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This amount will be held in escrow until verification is complete
                </p>
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
                disabled={isSubmitting || !title || !category || !bountyAmount || !address || checklist.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  "Create Task"
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
