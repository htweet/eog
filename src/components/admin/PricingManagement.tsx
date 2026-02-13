import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, CreditCard, Star, Save } from "lucide-react";

interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
  badge_text: string | null;
  is_popular: boolean;
}

export function PricingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<PricingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-pricing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features as string[] : [],
      })) as PricingPlan[];
    },
  });

  const openEdit = (plan: PricingPlan) => {
    setEditPlan(plan);
    setFeaturesText(plan.features.join("\n"));
    setIsCreating(false);
  };

  const openCreate = () => {
    setEditPlan({
      id: "",
      name: "",
      description: "",
      price: 0,
      billing_period: "monthly",
      features: [],
      is_active: true,
      sort_order: (plans?.length || 0) + 1,
      badge_text: null,
      is_popular: false,
    });
    setFeaturesText("");
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editPlan) return;
    setSaving(true);

    const features = featuresText.split("\n").filter(f => f.trim());
    const payload = {
      name: editPlan.name,
      description: editPlan.description,
      price: editPlan.price,
      billing_period: editPlan.billing_period,
      features: features as any,
      is_active: editPlan.is_active,
      sort_order: editPlan.sort_order,
      badge_text: editPlan.badge_text || null,
      is_popular: editPlan.is_popular,
    };

    try {
      if (isCreating) {
        const { error } = await supabase.from("pricing_plans").insert(payload);
        if (error) throw error;
        toast({ title: "Plan Created", description: `${editPlan.name} plan has been created` });
      } else {
        const { error } = await supabase.from("pricing_plans").update(payload).eq("id", editPlan.id);
        if (error) throw error;
        toast({ title: "Plan Updated", description: `${editPlan.name} plan has been updated` });
      }
      setEditPlan(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save plan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
    if (!error) {
      toast({ title: "Plan Deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pricing Plans
          </h3>
          <p className="text-sm text-muted-foreground">Manage plans visible on the landing page in real-time</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.is_popular && (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            <Star className="h-3 w-3 mr-0.5" />Popular
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {plan.price === 0 ? "Free" : `₦${plan.price.toLocaleString()}`}
                      <span className="text-xs text-muted-foreground">/{plan.billing_period}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {plan.features.length} features
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "outline"}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editPlan} onOpenChange={() => setEditPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Create Plan" : "Edit Plan"}</DialogTitle>
            <DialogDescription>Changes sync to the landing page in real-time</DialogDescription>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input value={editPlan.name} onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Price (₦)</Label>
                  <Input type="number" value={editPlan.price} onChange={(e) => setEditPlan({ ...editPlan, price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editPlan.description || ""} onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea rows={5} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input value={editPlan.badge_text || ""} onChange={(e) => setEditPlan({ ...editPlan, badge_text: e.target.value })} placeholder="e.g. Most Popular" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={editPlan.sort_order} onChange={(e) => setEditPlan({ ...editPlan, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editPlan.is_active} onCheckedChange={(c) => setEditPlan({ ...editPlan, is_active: c })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editPlan.is_popular} onCheckedChange={(c) => setEditPlan({ ...editPlan, is_popular: c })} />
                  <Label>Popular</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {isCreating ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
